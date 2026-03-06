"""
Replace text in PDF content streams using pikepdf.
Simple string find-and-replace on text operators (Tj, TJ).
Replacements are applied longest-first to avoid partial matches.

Before replacement, subsetted fonts are extended with full Segoe UI
glyphs so that new characters (digits, letters) are always available.
"""
import os
import sys
import pikepdf
from io import BytesIO
from fontTools.ttLib import TTFont

FONTS_DIR = os.path.join(os.path.dirname(__file__), "fonts")


def replace_text_in_pdf(template_bytes: bytes, replacements: dict[str, str]) -> bytes:
    if not replacements:
        return template_bytes

    sorted_reps = sorted(replacements.items(), key=lambda x: len(x[0]), reverse=True)

    pdf = pikepdf.open(BytesIO(template_bytes))

    # Extend subsetted fonts so replacement characters have glyphs
    _extend_subsetted_fonts(pdf)

    for page in pdf.pages:
        _replace_in_page(page, sorted_reps, pdf)

    out = BytesIO()
    pdf.save(out)
    return out.getvalue()


# ---------------------------------------------------------------------------
# Font extension — replace subsetted font programs with full Segoe UI
# ---------------------------------------------------------------------------

def _get_font_key(font_obj) -> str:
    """Get a stable dedup key for a font object using PDF object reference."""
    try:
        objgen = font_obj.objgen
        return f"{objgen[0]}:{objgen[1]}"
    except Exception:
        # Fallback: use BaseFont name
        return str(font_obj.get("/BaseFont", "")) + "|" + str(font_obj.get("/Subtype", ""))


def _extend_subsetted_fonts(pdf):
    """Find all subsetted TrueType fonts and replace their font programs
    with the full Segoe UI, ensuring all Latin characters are available."""
    segoe_regular = os.path.join(FONTS_DIR, "segoeui.ttf")
    segoe_bold = os.path.join(FONTS_DIR, "segoeuib.ttf")

    if not os.path.exists(segoe_regular):
        print(f"[extend_fonts] WARNING: Segoe UI not found at {segoe_regular}", file=sys.stderr, flush=True)
        return

    # Cache font data
    segoe_data = {}
    segoe_ttfonts = {}

    seen_fonts = set()  # avoid processing the same font object twice

    def _process_font(font_obj, font_name=""):
        """Process a single font, deduplicating by PDF object reference."""
        if not isinstance(font_obj, pikepdf.Dictionary):
            try:
                font_obj = font_obj.resolve() if hasattr(font_obj, 'resolve') else font_obj
            except Exception:
                return

        font_key = _get_font_key(font_obj)
        if font_key in seen_fonts:
            return
        seen_fonts.add(font_key)

        _try_extend_font(font_obj, segoe_regular, segoe_bold, segoe_data, segoe_ttfonts, pdf)

    for page in pdf.pages:
        resources = page.get("/Resources")
        if resources is None:
            continue
        fonts = resources.get("/Font")
        if fonts:
            for font_name in fonts.keys():
                _process_font(fonts[font_name], font_name)

        # Also check fonts inside Form XObjects
        xobjects = resources.get("/XObject")
        if xobjects:
            for xobj_name in xobjects.keys():
                xobj = xobjects[xobj_name]
                if not isinstance(xobj, pikepdf.Stream):
                    continue
                subtype = xobj.get("/Subtype")
                if subtype is not None and str(subtype) == "/Form":
                    xobj_resources = xobj.get("/Resources")
                    if xobj_resources:
                        xobj_fonts = xobj_resources.get("/Font")
                        if xobj_fonts:
                            for fn in xobj_fonts.keys():
                                _process_font(xobj_fonts[fn], fn)


def _try_extend_font(font_obj, segoe_regular, segoe_bold, segoe_data, segoe_ttfonts, pdf):
    """Extend a single font if it's a subsetted TrueType font."""
    try:
        subtype = str(font_obj.get("/Subtype", ""))
        if subtype not in ("/TrueType", "/Type0"):
            return

        base_font = str(font_obj.get("/BaseFont", ""))

        # Check if font is subsetted (ABCDEF+FontName pattern)
        # base_font from pikepdf may have leading "/" e.g. "/ONBHNX+SegoeUI"
        clean_name = base_font.lstrip("/")
        is_subsetted = "+" in clean_name and len(clean_name.split("+")[0]) == 6

        if subtype == "/TrueType":
            _extend_truetype_font(font_obj, is_subsetted, base_font, segoe_regular, segoe_bold, segoe_data, segoe_ttfonts, pdf)
        elif subtype == "/Type0":
            _extend_type0_font(font_obj, is_subsetted, base_font, segoe_regular, segoe_bold, segoe_data, segoe_ttfonts, pdf)
    except Exception as e:
        print(f"[extend_fonts] ERROR: {base_font}: {e}", file=sys.stderr, flush=True)


def _extend_truetype_font(font_obj, is_subsetted, base_font, segoe_regular, segoe_bold, segoe_data, segoe_ttfonts, pdf):
    """Extend a simple TrueType font by replacing its FontFile2 with full Segoe UI."""
    descriptor = font_obj.get("/FontDescriptor")
    if descriptor is None:
        return

    font_file = descriptor.get("/FontFile2")
    if font_file is None:
        return

    # Pick Segoe variant based on original font weight
    is_bold = "bold" in base_font.lower() or "Bold" in base_font
    segoe_path = segoe_bold if is_bold else segoe_regular

    if segoe_path not in segoe_data:
        with open(segoe_path, "rb") as f:
            segoe_data[segoe_path] = f.read()
        segoe_ttfonts[segoe_path] = TTFont(segoe_path)

    segoe_tt = segoe_ttfonts[segoe_path]

    # Replace the embedded font data with full Segoe UI (shared stream)
    stream_key = ("tt_stream", segoe_path)
    if stream_key not in segoe_data:
        segoe_data[stream_key] = pdf.make_stream(segoe_data[segoe_path])
        segoe_data[stream_key][pikepdf.Name("/Length1")] = len(segoe_data[segoe_path])
    descriptor[pikepdf.Name("/FontFile2")] = segoe_data[stream_key]

    # Reset encoding to standard WinAnsiEncoding so all character codes
    # map correctly to the full Segoe UI font glyphs
    font_obj[pikepdf.Name("/Encoding")] = pikepdf.Name("/WinAnsiEncoding")

    # Remove /ToUnicode if present — the standard encoding handles it
    if "/ToUnicode" in font_obj:
        del font_obj[pikepdf.Name("/ToUnicode")]

    # Extend /Widths to cover full WinAnsiEncoding range (32-255)
    first_char = int(font_obj.get("/FirstChar", 32))
    last_char = int(font_obj.get("/LastChar", 255))

    # Extend to full range
    new_first = 32
    new_last = 255

    # Build widths array from Segoe UI metrics
    cmap = segoe_tt.getBestCmap()
    units_per_em = segoe_tt["head"].unitsPerEm
    hmtx = segoe_tt["hmtx"]
    scale = 1000.0 / units_per_em

    new_widths = []
    for code in range(new_first, new_last + 1):
        if cmap and code in cmap:
            glyph_name = cmap[code]
            if glyph_name in hmtx.metrics:
                width = int(hmtx.metrics[glyph_name][0] * scale)
                new_widths.append(width)
            else:
                new_widths.append(600)
        else:
            new_widths.append(0)

    font_obj[pikepdf.Name("/FirstChar")] = new_first
    font_obj[pikepdf.Name("/LastChar")] = new_last
    font_obj[pikepdf.Name("/Widths")] = pikepdf.Array(new_widths)


def _extend_type0_font(font_obj, is_subsetted, base_font, segoe_regular, segoe_bold, segoe_data, segoe_ttfonts, pdf):
    """Extend a Type0 (CID) font by replacing the descendant's font file."""
    descendants = font_obj.get("/DescendantFonts")
    if descendants is None or len(descendants) == 0:
        return

    cid_font = descendants[0]
    if not isinstance(cid_font, pikepdf.Dictionary):
        try:
            cid_font = cid_font.resolve() if hasattr(cid_font, 'resolve') else cid_font
        except Exception:
            return

    descriptor = cid_font.get("/FontDescriptor")
    if descriptor is None:
        return

    font_file = descriptor.get("/FontFile2")
    if font_file is None:
        return

    is_bold = "bold" in base_font.lower()
    segoe_path = segoe_bold if is_bold else segoe_regular

    if segoe_path not in segoe_data:
        with open(segoe_path, "rb") as f:
            segoe_data[segoe_path] = f.read()
        segoe_ttfonts[segoe_path] = TTFont(segoe_path)

    # Shared font stream across all Type0 fonts using the same variant
    stream_key = ("cid_stream", segoe_path)
    if stream_key not in segoe_data:
        segoe_data[stream_key] = pdf.make_stream(segoe_data[segoe_path])
        segoe_data[stream_key][pikepdf.Name("/Length1")] = len(segoe_data[segoe_path])
    descriptor[pikepdf.Name("/FontFile2")] = segoe_data[stream_key]

    # Set CIDToGIDMap to Identity so CID values map directly to glyph indices
    # in the full Segoe UI font (where glyph indices match Unicode code points)
    cid_font[pikepdf.Name("/CIDToGIDMap")] = pikepdf.Name("/Identity")

    # Update DW (default width) from Segoe UI metrics
    segoe_tt = segoe_ttfonts[segoe_path]
    units_per_em = segoe_tt["head"].unitsPerEm
    scale = 1000.0 / units_per_em
    hmtx = segoe_tt["hmtx"]
    # Default width: use space glyph width
    cmap = segoe_tt.getBestCmap()
    if cmap and 32 in cmap:
        glyph_name = cmap[32]
        if glyph_name in hmtx.metrics:
            cid_font[pikepdf.Name("/DW")] = int(hmtx.metrics[glyph_name][0] * scale)



# ---------------------------------------------------------------------------
# Text replacement in content streams
# ---------------------------------------------------------------------------

def _get_type0_fonts(page) -> set:
    """Return the set of font names that are Type0 (CID) fonts on this page."""
    type0 = set()
    resources = page.get("/Resources") if isinstance(page, pikepdf.Dictionary) else (page.get("/Resources") if hasattr(page, 'get') else None)
    if resources is None:
        return type0
    fonts = resources.get("/Font")
    if fonts is None:
        return type0
    for name in fonts.keys():
        font_obj = fonts[name]
        try:
            if hasattr(font_obj, 'resolve') and not isinstance(font_obj, pikepdf.Dictionary):
                font_obj = font_obj.resolve()
            subtype = str(font_obj.get("/Subtype", ""))
            if subtype == "/Type0":
                type0.add(str(name))
        except Exception:
            pass
    return type0


def _replace_in_page(page, sorted_reps, pdf):
    """Replace text in a page's main content stream + Form XObjects."""
    type0_fonts = _get_type0_fonts(page)

    try:
        ops = pikepdf.parse_content_stream(page)
        new_ops = _process_operators(ops, sorted_reps, type0_fonts)
        page.Contents = pdf.make_stream(pikepdf.unparse_content_stream(new_ops))
    except Exception:
        pass

    resources = page.get("/Resources")
    if resources is None:
        return
    xobjects = resources.get("/XObject")
    if xobjects is None:
        return
    for key in xobjects.keys():
        xobj = xobjects[key]
        if not isinstance(xobj, pikepdf.Stream):
            continue
        subtype = xobj.get("/Subtype")
        if subtype is not None and str(subtype) == "/Form":
            try:
                xobj_type0 = set()
                xobj_resources = xobj.get("/Resources")
                if xobj_resources:
                    xobj_fonts_dict = xobj_resources.get("/Font")
                    if xobj_fonts_dict:
                        for fn in xobj_fonts_dict.keys():
                            fo = xobj_fonts_dict[fn]
                            try:
                                if hasattr(fo, 'resolve') and not isinstance(fo, pikepdf.Dictionary):
                                    fo = fo.resolve()
                                if str(fo.get("/Subtype", "")) == "/Type0":
                                    xobj_type0.add(str(fn))
                            except Exception:
                                pass

                ops = pikepdf.parse_content_stream(xobj)
                new_ops = _process_operators(ops, sorted_reps, xobj_type0)
                xobj.write(pikepdf.unparse_content_stream(new_ops))
            except Exception:
                pass


def _process_operators(ops, sorted_reps, type0_fonts: set):
    """Walk content-stream operators; replace text in Tj / TJ / ' / \" ops.
    Tracks current font via Tf to handle Type0 (2-byte) vs TrueType (1-byte)."""
    result = []
    current_font_is_type0 = False

    for operands, operator in ops:
        op_name = str(operator)

        # Track font changes: operands = [font_name, size] Tf
        if op_name == "Tf" and operands:
            font_name = str(operands[0])
            current_font_is_type0 = font_name in type0_fonts

        if op_name in ("Tj", "'", '"') and operands:
            operands = _replace_tj(operands, sorted_reps, current_font_is_type0)

        elif op_name == "TJ" and operands:
            operands = _replace_TJ(operands, sorted_reps, current_font_is_type0)

        result.append((operands, operator))
    return result


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _pdf_str(s, is_type0: bool = False) -> str:
    """Decode a pikepdf.String to a Python str.
    For Type0 (CID) fonts, decode 2-byte big-endian to Unicode."""
    raw = bytes(s)
    if is_type0:
        # 2-byte big-endian CID → Unicode
        try:
            return raw.decode("utf-16-be")
        except Exception:
            return raw.decode("latin-1")
    try:
        return raw.decode("latin-1")
    except Exception:
        return str(s)


def _make_pdf_str(text: str, is_type0: bool = False):
    """Create a pikepdf.String from a Python str.
    For Type0 (CID) fonts, encode as 2-byte big-endian."""
    if is_type0:
        return pikepdf.String(text.encode("utf-16-be"))
    return pikepdf.String(text.encode("latin-1"))


SHORT_THRESHOLD = 4  # Replacements this short or shorter use exact-match only

def _apply(text: str, sorted_reps, exact_only: bool = False) -> tuple[str, bool]:
    """Apply replacements to *text*; return (new_text, changed).

    Short replacement keys (≤ SHORT_THRESHOLD chars) only match when text
    is exactly equal — prevents '5' → '3' from corrupting '5317.261.504'.
    If *exact_only* is True, ALL replacements use exact match.
    """
    changed = False
    for old, new in sorted_reps:
        if len(old) <= SHORT_THRESHOLD or exact_only:
            # Exact match: the entire text must equal the old value
            if text.strip() == old:
                text = new
                changed = True
        else:
            if old in text:
                text = text.replace(old, new)
                changed = True
    return text, changed


def _replace_tj(operands, sorted_reps, is_type0: bool = False):
    """Handle a simple (string) Tj operator."""
    s = operands[0]
    if not isinstance(s, pikepdf.String):
        return operands
    text, changed = _apply(_pdf_str(s, is_type0), sorted_reps)
    if changed:
        return [_make_pdf_str(text, is_type0)]
    return operands


def _replace_TJ(operands, sorted_reps, is_type0: bool = False):
    """Handle a [(str) kern (str) ...] TJ operator."""
    arr = operands[0]
    if not isinstance(arr, pikepdf.Array):
        return operands

    # --- Pass 1: per-element replacement (preserves kerning) ---
    new_arr = []
    any_changed = False
    for item in arr:
        if isinstance(item, pikepdf.String):
            text, changed = _apply(_pdf_str(item, is_type0), sorted_reps)
            if changed:
                any_changed = True
            new_arr.append(_make_pdf_str(text, is_type0))
        else:
            new_arr.append(item)

    if any_changed:
        return [pikepdf.Array(new_arr)]

    # --- Pass 2: join all strings, check for cross-element matches ---
    joined = ""
    for item in arr:
        if isinstance(item, pikepdf.String):
            joined += _pdf_str(item, is_type0)

    new_joined, changed = _apply(joined, sorted_reps)
    if changed:
        return [pikepdf.Array([_make_pdf_str(new_joined, is_type0)])]

    return operands
