"""
Replace text in PDF content streams using pikepdf.
Simple string find-and-replace on text operators (Tj, TJ).
Replacements are applied longest-first to avoid partial matches.
"""
import pikepdf
from io import BytesIO


def replace_text_in_pdf(template_bytes: bytes, replacements: dict[str, str]) -> bytes:
    """
    Replace text strings in all pages of a PDF.

    Args:
        template_bytes: Original PDF file bytes.
        replacements: {old_text: new_text, ...}

    Returns:
        Modified PDF as bytes.
    """
    if not replacements:
        return template_bytes

    # Sort longest-first so "May 14, 2026" is replaced before "14"
    sorted_reps = sorted(replacements.items(), key=lambda x: len(x[0]), reverse=True)

    pdf = pikepdf.open(BytesIO(template_bytes))

    for page in pdf.pages:
        _replace_in_page(page, sorted_reps, pdf)

    out = BytesIO()
    pdf.save(out)
    return out.getvalue()


def _replace_in_page(page, sorted_reps, pdf):
    """Replace text in a page's main content stream + Form XObjects."""
    # Main content stream
    try:
        ops = pikepdf.parse_content_stream(page)
        new_ops = _process_operators(ops, sorted_reps)
        page.Contents = pdf.make_stream(pikepdf.unparse_content_stream(new_ops))
    except Exception:
        pass

    # Form XObjects (some PDFs embed text in these)
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
        # Collapse to a single string (loses inter-character kerning)
        return [pikepdf.Array([_make_pdf_str(new_joined)])]

    return operands
