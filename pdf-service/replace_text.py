"""
Replace text in PDF content streams using pikepdf.
Simple string find-and-replace on text operators (Tj, TJ).
Replacements are applied longest-first to avoid partial matches.

Before replacement, subsetted fonts are extended with full Segoe UI
glyphs so that new characters (digits, letters) are always available.

After replacement, text positioning (Tm operators) is adjusted so that
centered text stays centered and right-aligned text stays right-aligned.
"""
from __future__ import annotations

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

    # Collect font width tables for position adjustment
    font_widths = _collect_font_widths(pdf)

    for page in pdf.pages:
        _replace_in_page(page, sorted_reps, pdf, font_widths)

    out = BytesIO()
    pdf.save(out)
    return out.getvalue()


# ---------------------------------------------------------------------------
# Font width collection — for calculating text widths after replacement
# ---------------------------------------------------------------------------

def _collect_font_widths(pdf) -> dict[str, list[int]]:
    """Collect {font_name: {char_code: width}} for all fonts in the PDF."""
    result = {}
    for page in pdf.pages:
        resources = page.get("/Resources")
        if resources is None:
            continue
        _collect_widths_from_resources(resources, result)
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
                        _collect_widths_from_resources(xobj_resources, result)
    return result


def _collect_widths_from_resources(resources, result: dict):
    """Extract font width tables from a Resources dictionary."""
    fonts = resources.get("/Font")
    if fonts is None:
        return
    for font_name in fonts.keys():
        fn = str(font_name)
        if fn in result:
            continue
        font_obj = fonts[font_name]
        try:
            if hasattr(font_obj, 'resolve') and not isinstance(font_obj, pikepdf.Dictionary):
                font_obj = font_obj.resolve()
            first_char = int(font_obj.get("/FirstChar", 0))
            widths_arr = font_obj.get("/Widths")
            if widths_arr:
                widths = {}
                for i, w in enumerate(widths_arr):
                    widths[first_char + i] = int(w)
                result[fn] = widths
        except Exception:
            pass


def _text_width_pt(text: str, font_widths: dict[int, int], font_size: float) -> float:
    """Calculate text width in points given font widths dict and size."""
    total = 0
    for ch in text:
        code = ord(ch)
        w = font_widths.get(code, 500)  # default 500 if unknown
        total += w
    return total / 1000.0 * font_size


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

    # Extend /Widths: preserve original widths, only add Segoe UI for new chars
    orig_first = int(font_obj.get("/FirstChar", 32))
    orig_last = int(font_obj.get("/LastChar", 255))
    orig_widths = font_obj.get("/Widths")
    orig_widths_list = [int(w) for w in orig_widths] if orig_widths else []

    new_first = 32
    new_last = 255

    # Build Segoe UI widths for reference
    cmap = segoe_tt.getBestCmap()
    units_per_em = segoe_tt["head"].unitsPerEm
    hmtx = segoe_tt["hmtx"]
    scale = 1000.0 / units_per_em

    new_widths = []
    for code in range(new_first, new_last + 1):
        # Preserve original width if this char had a non-zero width
        # (zero width means char wasn't in original subset — use Segoe UI instead)
        if orig_first <= code <= orig_last and orig_widths_list:
            idx = code - orig_first
            if 0 <= idx < len(orig_widths_list) and orig_widths_list[idx] > 0:
                new_widths.append(orig_widths_list[idx])
                continue

        # New/missing char: use Segoe UI metrics
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


def _replace_in_page(page, sorted_reps, pdf, font_widths):
    """Replace text in a page's main content stream + Form XObjects."""
    type0_fonts = _get_type0_fonts(page)

    try:
        ops = pikepdf.parse_content_stream(page)
        new_ops = _process_operators(ops, sorted_reps, type0_fonts, font_widths)
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
                new_ops = _process_operators(ops, sorted_reps, xobj_type0, font_widths)
                xobj.write(pikepdf.unparse_content_stream(new_ops))
            except Exception:
                pass


def _process_operators(ops, sorted_reps, type0_fonts: set, font_widths: dict):
    """Walk content-stream operators; replace text in Tj / TJ / ' / \" ops.
    Tracks current font via Tf to handle Type0 (2-byte) vs TrueType (1-byte).
    After replacement, adjusts the most recent positioning operator (Tm or Td)
    so that text stays visually centered or right-aligned when its width changes."""
    result = []
    current_font_is_type0 = False
    current_font_name = ""
    current_font_size = 0.0
    # Track the most recent positioning operator that directly precedes this text
    last_pos_index = -1      # index in result[] of the Tm or Td to adjust
    last_pos_type = ""       # "Tm" or "Td"
    last_tm_scale = 0.0      # font scale from the most recent Tm

    for operands, operator in ops:
        op_name = str(operator)

        # Track font changes: operands = [font_name, size] Tf
        if op_name == "Tf" and operands:
            current_font_name = str(operands[0])
            current_font_is_type0 = current_font_name in type0_fonts
            if len(operands) > 1:
                current_font_size = float(operands[1])

        # Track text matrix: Tm sets absolute position
        if op_name == "Tm" and len(operands) >= 6:
            result.append((operands, operator))
            last_pos_index = len(result) - 1
            last_pos_type = "Tm"
            last_tm_scale = float(operands[0])
            continue

        # Track relative position: Td/TD set relative offset
        if op_name in ("Td", "TD") and len(operands) >= 2:
            result.append((operands, operator))
            last_pos_index = len(result) - 1
            last_pos_type = op_name
            continue

        if op_name in ("Tj", "'", '"') and operands:
            old_text = _get_text(operands, op_name, current_font_is_type0)
            new_operands = _replace_tj(operands, sorted_reps, current_font_is_type0)

            if new_operands is not operands:
                new_text = _get_text(new_operands, op_name, current_font_is_type0)
                if old_text and new_text and old_text != new_text:
                    _adjust_position(result, last_pos_index, last_pos_type,
                                     last_tm_scale, current_font_name, font_widths,
                                     old_text, new_text)
            operands = new_operands

        elif op_name == "TJ" and operands:
            old_text = _get_TJ_text(operands, current_font_is_type0)
            new_operands = _replace_TJ(operands, sorted_reps, current_font_is_type0)

            if new_operands is not operands:
                new_text = _get_TJ_text(new_operands, current_font_is_type0)
                if old_text and new_text and old_text != new_text:
                    _adjust_position(result, last_pos_index, last_pos_type,
                                     last_tm_scale, current_font_name, font_widths,
                                     old_text, new_text)
            operands = new_operands

        result.append((operands, operator))
    return result


def _get_text(operands, op_name: str, is_type0: bool) -> str:
    """Extract plain text from Tj/' /\" operands."""
    if not operands:
        return ""
    s = operands[0]
    if isinstance(s, pikepdf.String):
        return _pdf_str(s, is_type0)
    return ""


def _get_TJ_text(operands, is_type0: bool) -> str:
    """Extract joined plain text from TJ operands."""
    if not operands:
        return ""
    arr = operands[0]
    if not isinstance(arr, pikepdf.Array):
        return ""
    joined = ""
    for item in arr:
        if isinstance(item, pikepdf.String):
            joined += _pdf_str(item, is_type0)
    return joined


def _adjust_position(result: list, pos_index: int, pos_type: str,
                     tm_scale: float, font_name: str, font_widths: dict,
                     old_text: str, new_text: str):
    """Adjust the positioning operator (Tm or Td) at result[pos_index] so that
    the replaced text maintains its visual alignment."""
    if pos_index < 0 or pos_index >= len(result):
        return

    fw = font_widths.get(font_name)
    if not fw:
        return

    # Calculate widths in font units
    old_width_fu = sum(fw.get(ord(c), 500) for c in old_text)
    new_width_fu = sum(fw.get(ord(c), 500) for c in new_text)

    if old_width_fu == new_width_fu:
        return  # same width, no adjustment needed

    # Actual font size in points = tm_scale * tf_size (tf_size is usually 1.0)
    font_size_pt = tm_scale  # since Tf size=1, the Tm scale IS the font size

    # Width difference in points
    old_width_pt = old_width_fu / 1000.0 * font_size_pt
    new_width_pt = new_width_fu / 1000.0 * font_size_pt
    width_diff = old_width_pt - new_width_pt  # positive = new text is narrower

    # Determine alignment strategy based on text characteristics
    alignment = _detect_alignment(old_text, new_text, font_size_pt)

    if alignment == "left":
        return  # no adjustment for left-aligned text

    pos_operands, pos_op = result[pos_index]

    if pos_type == "Tm":
        # Absolute positioning: adjust tx (operand index 4)
        tx = float(pos_operands[4])
        if alignment == "center":
            new_tx = tx + width_diff / 2.0
        else:  # right
            new_tx = tx + width_diff

        new_operands = list(pos_operands)
        new_operands[4] = pikepdf.Object.parse(f"{new_tx:.4f}".encode())
        result[pos_index] = (new_operands, pos_op)

    elif pos_type in ("Td", "TD"):
        # Relative positioning: adjust dx (operand index 0)
        dx = float(pos_operands[0])
        if alignment == "center":
            new_dx = dx + width_diff / 2.0
        else:  # right
            new_dx = dx + width_diff

        new_operands = list(pos_operands)
        new_operands[0] = pikepdf.Object.parse(f"{new_dx:.4f}".encode())
        result[pos_index] = (new_operands, pos_op)


def _detect_alignment(old_text: str, new_text: str, font_size_pt: float) -> str:
    """Detect whether text should be centered, right-aligned, or left-aligned.

    Heuristics:
    - Large font (>= 15pt) and mostly digits/commas → centered (date day numbers)
      or right-aligned (price totals)
    - All-uppercase short text (month names, weekdays) → centered
    - Numeric with commas (prices) → right-aligned
    - Everything else → left (no adjustment)
    """
    old_stripped = old_text.strip()
    new_stripped = new_text.strip()

    # Date day numbers: short, digits only, large font
    if (old_stripped.isdigit() and new_stripped.isdigit()
            and len(old_stripped) <= 2 and len(new_stripped) <= 2
            and font_size_pt >= 15):
        return "center"

    # Month names: all uppercase letters, moderate font
    if (old_stripped.isalpha() and old_stripped.isupper()
            and new_stripped.isalpha() and new_stripped.isupper()
            and len(old_stripped) <= 12):
        return "center"

    # Weekday names: capitalized single word
    weekdays = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"}
    if old_stripped in weekdays or new_stripped in weekdays:
        return "center"

    # Price totals: digits with comma separators
    # At least one of old/new must have a comma (to distinguish from PIN codes etc.)
    def _is_numeric(s):
        return all(c in "0123456789,." for c in s) and any(c.isdigit() for c in s)

    if (_is_numeric(old_stripped) and _is_numeric(new_stripped)
            and ("," in old_stripped or "," in new_stripped)
            and len(old_stripped) >= 3):
        return "right"

    return "left"


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
