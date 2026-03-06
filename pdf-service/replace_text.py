"""
Replace text in PDF content streams using pikepdf.
Simple string find-and-replace on text operators (Tj, TJ).
Replacements are applied longest-first to avoid partial matches.

Before replacement, subsetted fonts are extended with full Segoe UI
glyphs so that new characters (digits, letters) are always available.
"""
import os
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

def _extend_subsetted_fonts(pdf):
    """Find all subsetted TrueType fonts and replace their font programs
    with the full Segoe UI, ensuring all Latin characters are available."""
    segoe_regular = os.path.join(FONTS_DIR, "segoeui.ttf")
    segoe_bold = os.path.join(FONTS_DIR, "segoeuib.ttf")

    if not os.path.exists(segoe_regular):
        return

    # Cache font data
    segoe_data = {}
    segoe_ttfonts = {}

    seen_fonts = set()  # avoid processing the same font object twice

    for page in pdf.pages:
        resources = page.get("/Resources")
        if resources is None:
            continue
        fonts = resources.get("/Font")
        if fonts is None:
            continue

        for font_name in fonts.keys():
            font_obj = fonts[font_name]
            if not isinstance(font_obj, pikepdf.Dictionary):
                try:
                    font_obj = font_obj.resolve() if hasattr(font_obj, 'resolve') else font_obj
                except Exception:
                    continue

            font_id = id(font_obj)
            if font_id in seen_fonts:
                continue
            seen_fonts.add(font_id)

            _try_extend_font(font_obj, segoe_regular, segoe_bold, segoe_data, segoe_ttfonts, pdf)

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
                                fo = xobj_fonts[fn]
                                if not isinstance(fo, pikepdf.Dictionary):
                                    try:
                                        fo = fo.resolve() if hasattr(fo, 'resolve') else fo
                                    except Exception:
                                        continue
                                fid = id(fo)
                                if fid in seen_fonts:
                                    continue
                                seen_fonts.add(fid)
                                _try_extend_font(fo, segoe_regular, segoe_bold, segoe_data, segoe_ttfonts, pdf)


def _try_extend_font(font_obj, segoe_regular, segoe_bold, segoe_data, segoe_ttfonts, pdf):
    """Extend a single font if it's a subsetted TrueType font."""
    try:
        subtype = str(font_obj.get("/Subtype", ""))
        if subtype not in ("/TrueType", "/Type0"):
            return

        base_font = str(font_obj.get("/BaseFont", ""))

        # Check if font is subsetted (ABCDEF+FontName pattern)
        is_subsetted = "+" in base_font and len(base_font.split("+")[0]) == 6

        if subtype == "/TrueType":
            _extend_truetype_font(font_obj, is_subsetted, base_font, segoe_regular, segoe_bold, segoe_data, segoe_ttfonts, pdf)
        elif subtype == "/Type0":
            _extend_type0_font(font_obj, is_subsetted, base_font, segoe_regular, segoe_bold, segoe_data, segoe_ttfonts, pdf)
    except Exception:
        pass


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

    # Replace the embedded font data with full Segoe UI
    new_stream = pdf.make_stream(segoe_data[segoe_path])
    new_stream[pikepdf.Name("/Length1")] = len(segoe_data[segoe_path])
    descriptor[pikepdf.Name("/FontFile2")] = new_stream

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

    new_stream = pdf.make_stream(segoe_data[segoe_path])
    new_stream[pikepdf.Name("/Length1")] = len(segoe_data[segoe_path])
    descriptor[pikepdf.Name("/FontFile2")] = new_stream


# ---------------------------------------------------------------------------
# Text replacement in content streams
# ---------------------------------------------------------------------------

def _replace_in_page(page, sorted_reps, pdf):
    """Replace text in a page's main content stream + Form XObjects."""
    try:
        ops = pikepdf.parse_content_stream(page)
        new_ops = _process_operators(ops, sorted_reps)
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
                ops = pikepdf.parse_content_stream(xobj)
                new_ops = _process_operators(ops, sorted_reps)
                xobj.write(pikepdf.unparse_content_stream(new_ops))
            except Exception:
                pass


def _process_operators(ops, sorted_reps):
    """Walk content-stream operators; replace text in Tj / TJ / ' / \" ops."""
    result = []
    for operands, operator in ops:
        op_name = str(operator)

        if op_name in ("Tj", "'", '"') and operands:
            operands = _replace_tj(operands, sorted_reps)

        elif op_name == "TJ" and operands:
            operands = _replace_TJ(operands, sorted_reps)

        result.append((operands, operator))
    return result


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _pdf_str(s) -> str:
    """Decode a pikepdf.String to a Python str."""
    try:
        return bytes(s).decode("latin-1")
    except Exception:
        return str(s)


def _make_pdf_str(text: str):
    """Create a pikepdf.String from a Python str."""
    return pikepdf.String(text.encode("latin-1"))


def _apply(text: str, sorted_reps) -> tuple[str, bool]:
    """Apply replacements to *text*; return (new_text, changed)."""
    changed = False
    for old, new in sorted_reps:
        if old in text:
            text = text.replace(old, new)
            changed = True
    return text, changed


def _replace_tj(operands, sorted_reps):
    """Handle a simple (string) Tj operator."""
    s = operands[0]
    if not isinstance(s, pikepdf.String):
        return operands
    text, changed = _apply(_pdf_str(s), sorted_reps)
    if changed:
        return [_make_pdf_str(text)]
    return operands


def _replace_TJ(operands, sorted_reps):
    """Handle a [(str) kern (str) ...] TJ operator."""
    arr = operands[0]
    if not isinstance(arr, pikepdf.Array):
        return operands

    # --- Pass 1: per-element replacement (preserves kerning) ---
    new_arr = []
    any_changed = False
    for item in arr:
        if isinstance(item, pikepdf.String):
            text, changed = _apply(_pdf_str(item), sorted_reps)
            if changed:
                any_changed = True
            new_arr.append(_make_pdf_str(text))
        else:
            new_arr.append(item)

    if any_changed:
        return [pikepdf.Array(new_arr)]

    # --- Pass 2: join all strings, check for cross-element matches ---
    joined = ""
    for item in arr:
        if isinstance(item, pikepdf.String):
            joined += _pdf_str(item)

    new_joined, changed = _apply(joined, sorted_reps)
    if changed:
        return [pikepdf.Array([_make_pdf_str(new_joined)])]

    return operands
