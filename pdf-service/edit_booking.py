import pikepdf
import re
from decimal import Decimal
from datetime import datetime
from dataclasses import dataclass
from fontTools.ttLib import TTFont
import io

# CONFIGURATION — defaults (Cabinn template)
BOLD_FONT_PATH = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
REGULAR_FONT_PATH = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
ITALIC_FONT_PATH = "/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf"

CI_CENTER = 364.9
CO_CENTER = 448.0
NIGHTS_CENTER = 545.5

@dataclass
class BookingData:
    checkin_day: str
    checkin_month: str
    checkin_weekday: str
    checkin_time: str
    checkout_day: str
    checkout_month: str
    checkout_weekday: str
    checkout_time: str
    nights: str
    confirmation_number: str
    pin_code: str
    guest_name: str
    refund_date_str: str

def booking_from_dates(checkin_date, checkout_date, confirmation_number, pin_code, guest_name, checkin_time=" 15:00 - 00:00", checkout_time=" until 11:00"):
    ci = datetime.strptime(checkin_date, "%Y-%m-%d")
    co = datetime.strptime(checkout_date, "%Y-%m-%d")
    refund_date_str = f"{ci.day} {ci.strftime('%B')} {ci.year}"
    return BookingData(
        checkin_day=str(ci.day), checkin_month=ci.strftime("%B").upper(),
        checkin_weekday=ci.strftime("%A"), checkin_time=checkin_time,
        checkout_day=str(co.day), checkout_month=co.strftime("%B").upper(),
        checkout_weekday=co.strftime("%A"), checkout_time=checkout_time,
        nights=str((co - ci).days), confirmation_number=confirmation_number,
        pin_code=pin_code, guest_name=guest_name.upper(), refund_date_str=refund_date_str,
    )

class FontMetrics:
    def __init__(self, font_path):
        tt = TTFont(font_path)
        self.cmap = tt.getBestCmap()
        self.hmtx = tt['hmtx']
        self.upem = tt['head'].unitsPerEm
        self._tt = tt

    def text_width(self, text, font_size):
        total = 0
        for ch in text:
            g = self.cmap.get(ord(ch))
            if g and g in self.hmtx.metrics:
                total += self.hmtx.metrics[g][0]
        return (total / self.upem) * font_size

    def centered_x(self, text, font_size, center):
        return center - self.text_width(text, font_size) / 2

WIN_ANSI_MAP = {
    128: 0x20AC, 130: 0x201A, 131: 0x0192, 132: 0x201E, 133: 0x2026,
    134: 0x2020, 135: 0x2021, 136: 0x02C6, 137: 0x2030,
    138: 0x0160, 139: 0x2039, 140: 0x0152, 142: 0x017D,
    145: 0x2018, 146: 0x2019, 147: 0x201C, 148: 0x201D,
    149: 0x2022, 150: 0x2013, 151: 0x2014, 152: 0x02DC, 153: 0x2122,
    154: 0x0161, 155: 0x203A, 156: 0x0153, 158: 0x017E, 159: 0x0178,
}

def _get_glyph_widths(font_path, first_char, last_char):
    tt = TTFont(font_path)
    cmap = tt.getBestCmap()
    hmtx = tt['hmtx']
    scale = 1000 / tt['head'].unitsPerEm
    widths = []
    for cc in range(first_char, last_char + 1):
        unicode_cp = WIN_ANSI_MAP.get(cc, cc)
        g = cmap.get(unicode_cp)
        if g and g in hmtx.metrics:
            widths.append(Decimal(str(round(hmtx.metrics[g][0] * scale, 6))))
        else:
            widths.append(Decimal('0'))
    tt.close()
    return widths

def _replace_font(pdf, font_dict, new_font_path):
    with open(new_font_path, "rb") as f:
        data = f.read()
    fc = min(int(font_dict.get("/FirstChar", 32)), 32)
    lc = max(int(font_dict.get("/LastChar", 126)), 126)
    widths = _get_glyph_widths(new_font_path, fc, lc)
    font_dict[pikepdf.Name("/FirstChar")] = fc
    font_dict[pikepdf.Name("/LastChar")] = lc
    font_dict[pikepdf.Name("/Widths")] = pikepdf.Array(widths)
    fd = font_dict.get("/FontDescriptor")
    if fd:
        s = pikepdf.Stream(pdf, data)
        s[pikepdf.Name("/Length1")] = len(data)
        fd[pikepdf.Name("/FontFile2")] = s

def _esc(s):
    return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

def _replace_tm_and_tj(stream, old_tm_x, tm_y, old_text, new_text, new_x):
    tm_pat = rf'({re.escape(old_tm_x)}\s+{re.escape(tm_y)}\s+Tm)'
    tm_match = re.search(tm_pat, stream)
    if not tm_match:
        return stream.replace(f"({old_text})Tj", f"({_esc(new_text)})Tj", 1)
    old_tm = tm_match.group(1)
    new_tm = old_tm.replace(old_tm_x, f"{new_x:.4f}", 1)
    stream = stream[:tm_match.start()] + new_tm + stream[tm_match.end():]
    offset = tm_match.start() + len(new_tm)
    old_tj = f"({old_text})Tj"
    new_tj = f"({_esc(new_text)})Tj"
    idx = stream.find(old_tj, offset)
    if idx >= 0:
        stream = stream[:idx] + new_tj + stream[idx + len(old_tj):]
    return stream

def _replace_tj_array_centered(stream, tj_pattern, new_text, tm_y, new_x):
    match = re.search(tj_pattern, stream)
    if not match:
        return stream
    tj_start = match.start()
    tm_pat = rf'(\d+\.?\d*)\s+0\s+0\s+(\d+\.?\d*)\s+(\d+\.?\d+)\s+{re.escape(tm_y)}\s+Tm'
    tm_matches = list(re.finditer(tm_pat, stream[:tj_start]))
    new_tj = f"({_esc(new_text)})Tj"
    if tm_matches:
        last_tm = tm_matches[-1]
        old_x = last_tm.group(3)
        old_tm_str = last_tm.group(0)
        new_tm_str = old_tm_str.replace(old_x, f"{new_x:.4f}", 1)
        stream = stream[:last_tm.start()] + new_tm_str + stream[last_tm.end():]
        match = re.search(tj_pattern, stream)
        if match:
            stream = stream[:match.start()] + new_tj + stream[match.end():]
    else:
        stream = stream[:match.start()] + new_tj + stream[match.end():]
    return stream

def _replace_weekday(stream, old_weekday, new_weekday, new_x, font_size):
    old_tj = f"({old_weekday})Tj"
    tj_idx = stream.find(old_tj)
    if tj_idx < 0:
        return stream
    region_start = max(0, tj_idx - 200)
    region = stream[region_start:tj_idx]
    td_match = re.search(r'([\-\d.]+)\s+([\-\d.]+)\s+Td', region)
    if not td_match:
        return stream.replace(old_tj, f"({_esc(new_weekday)})Tj", 1)
    td_abs = region_start + td_match.start()
    before_td = stream[:td_abs]
    tm_matches = list(re.finditer(r'(\d+\.?\d+)\s+486\.6125\s+Tm', before_td))
    if not tm_matches:
        return stream.replace(old_tj, f"({_esc(new_weekday)})Tj", 1)
    current_month_x = float(tm_matches[-1].group(1))
    new_dx = (new_x - current_month_x) / font_size
    old_td = td_match.group(0)
    new_td = old_td.replace(td_match.group(1), f"{new_dx:.3f}", 1)
    stream = stream[:td_abs] + new_td + stream[td_abs + len(old_td):]
    new_tj = f"({_esc(new_weekday)})Tj"
    search_from = td_abs + len(new_td)
    idx = stream.find(old_tj, search_from)
    if idx >= 0:
        stream = stream[:idx] + new_tj + stream[idx + len(old_tj):]
    return stream

def _replace_simple_text(stream, old_text, new_text, context=None):
    old_tj = f"({old_text})Tj"
    new_tj = f"({_esc(new_text)})Tj"
    if context:
        idx = stream.find(context)
        if idx >= 0:
            tj_idx = stream.find(old_tj, idx)
            if tj_idx >= 0:
                return stream[:tj_idx] + new_tj + stream[tj_idx + len(old_tj):]
    return stream.replace(old_tj, new_tj, 1)

def _replace_tj_array_simple(stream, pattern, new_text):
    return re.sub(pattern, f"({_esc(new_text)})Tj", stream, count=1)

def edit_booking_pdf(template_bytes: bytes, booking: BookingData, edit_config: dict = None) -> bytes:
    """Edit a booking PDF template with booking data. Config-driven for different hotel templates."""
    if edit_config is None:
        edit_config = {}

    # Get config with defaults
    centers = edit_config.get("column_centers", {})
    ci_center = centers.get("checkin", CI_CENTER)
    co_center = centers.get("checkout", CO_CENTER)
    nights_center = centers.get("nights", NIGHTS_CENTER)

    font_names = edit_config.get("font_names", {})
    bold_names = font_names.get("bold", ["/TT0", "/TT9", "/TT12"])
    italic_names = font_names.get("italic", ["/TT13"])
    regular_names = font_names.get("regular", ["/TT3", "/TT4"])

    patterns = edit_config.get("patterns", {})

    pdf = pikepdf.open(io.BytesIO(template_bytes))
    page = pdf.pages[0]

    # 1. Replace font subsets
    fonts = page["/Resources"]["/Font"]
    for name in bold_names:
        if name in fonts:
            _replace_font(pdf, fonts[name], BOLD_FONT_PATH)
    for name in italic_names:
        if name in fonts:
            _replace_font(pdf, fonts[name], ITALIC_FONT_PATH)
    for name in regular_names:
        if name in fonts:
            _replace_font(pdf, fonts[name], REGULAR_FONT_PATH)

    # 2. Calculate centered positions
    bold = FontMetrics(BOLD_FONT_PATH)
    italic = FontMetrics(ITALIC_FONT_PATH)

    ci_day_x = bold.centered_x(booking.checkin_day, 19.5, ci_center)
    co_day_x = bold.centered_x(booking.checkout_day, 19.5, co_center)
    nights_x = bold.centered_x(booking.nights, 19.5, nights_center)
    ci_month_x = bold.centered_x(booking.checkin_month, 7.5, ci_center)
    co_month_x = bold.centered_x(booking.checkout_month, 7.5, co_center)
    ci_wday_x = italic.centered_x(booking.checkin_weekday, 7.5, ci_center)
    co_wday_x = italic.centered_x(booking.checkout_weekday, 7.5, co_center)

    # 3. Edit content stream
    contents = page["/Contents"]
    stream = contents.read_bytes().decode('latin-1')

    # Get patterns with defaults
    conf_pat = patterns.get("confirmation", r'\[\(5087\.509\)-?\d*\s*\(\.967\)\]TJ')
    pin_cfg = patterns.get("pin", {"old_text": "0751", "context": "PIN C"})
    guest_pat = patterns.get("guest_name", r'\[\(\s*CA\)\d+\s*\(GRI ONCEK\)\]TJ')
    ci_day_cfg = patterns.get("checkin_day", {"old_tm_x": "354.1875", "tm_y": "498.1125", "old_text": "30"})
    ci_month_cfg = patterns.get("checkin_month", {"pattern": r'\[\(MAR\)\d+\s*\(CH\)\]TJ', "tm_y": "486.6125"})
    ci_wday_cfg = patterns.get("checkin_weekday", {"old_text": "Monday"})
    ci_time_pat = patterns.get("checkin_time", r'\[\(\s*15:0\)\d*\s*\(0 - 00\)\d*\s*\(:00\)\]TJ')
    co_day_cfg = patterns.get("checkout_day", {"old_tm_x": "441.7625", "tm_y": "498.1125", "old_text": "7"})
    co_month_cfg = patterns.get("checkout_month", {"old_tm_x": "436.8625", "tm_y": "486.6125", "old_text": "APRIL"})
    co_wday_cfg = patterns.get("checkout_weekday", {"old_text": "Tuesday"})
    co_time_pat = patterns.get("checkout_time", r'\[\(\s*until 11\)\d*\s*\(:00\)\]TJ')
    nights_cfg = patterns.get("nights", {"old_tm_x": "539.475", "tm_y": "498.1125", "old_text": "8"})
    refund2_cfg = patterns.get("refund_line2", {"old_text": "on 30 March 2026. If you cancel from 12:00 on"})
    refund3_cfg = patterns.get("refund_line3", {"old_text": "30 March 2026, you'll get a TL"})

    # Apply edits
    stream = _replace_tj_array_simple(stream, conf_pat, booking.confirmation_number)
    stream = _replace_simple_text(stream, pin_cfg["old_text"], booking.pin_code, context=pin_cfg.get("context"))
    stream = _replace_tj_array_simple(stream, guest_pat, f" {booking.guest_name}")
    stream = _replace_tm_and_tj(stream, ci_day_cfg["old_tm_x"], ci_day_cfg["tm_y"], ci_day_cfg["old_text"], booking.checkin_day, ci_day_x)
    stream = _replace_tj_array_centered(stream, ci_month_cfg["pattern"], booking.checkin_month, ci_month_cfg["tm_y"], ci_month_x)
    stream = _replace_weekday(stream, ci_wday_cfg["old_text"], booking.checkin_weekday, ci_wday_x, 7.5)
    stream = _replace_tj_array_simple(stream, ci_time_pat, booking.checkin_time)
    stream = _replace_tm_and_tj(stream, co_day_cfg["old_tm_x"], co_day_cfg["tm_y"], co_day_cfg["old_text"], booking.checkout_day, co_day_x)

    # Check-out month: could be Tm+Tj or TJ array
    if "pattern" in co_month_cfg:
        stream = _replace_tj_array_centered(stream, co_month_cfg["pattern"], booking.checkout_month, co_month_cfg["tm_y"], co_month_x)
    else:
        stream = _replace_tm_and_tj(stream, co_month_cfg["old_tm_x"], co_month_cfg["tm_y"], co_month_cfg["old_text"], booking.checkout_month, co_month_x)

    stream = _replace_weekday(stream, co_wday_cfg["old_text"], booking.checkout_weekday, co_wday_x, 7.5)
    stream = _replace_tj_array_simple(stream, co_time_pat, booking.checkout_time)
    stream = _replace_tm_and_tj(stream, nights_cfg["old_tm_x"], nights_cfg["tm_y"], nights_cfg["old_text"], booking.nights, nights_x)

    # Refund lines
    new_refund2 = f"on {booking.refund_date_str}. If you cancel from 12:00 on"
    stream = _replace_simple_text(stream, refund2_cfg["old_text"], new_refund2)
    new_refund3 = f"{booking.refund_date_str}, you'll get a TL"
    stream = _replace_simple_text(stream, refund3_cfg["old_text"], new_refund3)

    # Refund line 1 (static pattern)
    refund1_pat = patterns.get("refund_line1", r"\[\(Y\)88\s*\(ou\'ll get a full r\)-?\d*\s*\(efund if you cancel before 11:\)\d*\s*\(59\)\]TJ")
    stream = _replace_tj_array_simple(stream, refund1_pat, "You'll get a full refund if you cancel before 11:59")

    # 4. Write back
    contents.write(stream.encode('latin-1'))

    output = io.BytesIO()
    pdf.save(output)
    pdf.close()
    return output.getvalue()
