"""
Cabinn Apartments — Booking PDF Inline Editor
================================================
Directly modifies PDF content stream (like Acrobat).
No overlays, no white boxes, indistinguishable from original.

Editable fields:

- Check-in / check-out dates (day, month, weekday)
- Number of nights
- Confirmation number & PIN code
- Guest name
- Refund schedule dates (auto-calculated from check-in)

Install:
pip install pikepdf fonttools

Usage:
python edit_booking_inline.py

For pixel-perfect output on Windows, uncomment the Segoe UI / Georgia
font paths in the CONFIGURATION section below.
"""

import pikepdf
import re
from decimal import Decimal
from datetime import datetime
from dataclasses import dataclass
from fontTools.ttLib import TTFont

# ═══════════════════════════════════════════════════════════════════

# CONFIGURATION

# ═══════════════════════════════════════════════════════════════════

# OPTION A: Perfect match (Windows — actual Segoe UI / Georgia)

# BOLD_FONT_PATH = "C:/Windows/Fonts/segoeuib.ttf"

# REGULAR_FONT_PATH = "C:/Windows/Fonts/segoeui.ttf"

# ITALIC_FONT_PATH = "C:/Windows/Fonts/georgiai.ttf"

#

# OPTION B: Linux/Mac fallback (metrically close substitutes)

BOLD_FONT_PATH = "/usr/share/fonts/truetype/crosextra/Carlito-Bold.ttf"
REGULAR_FONT_PATH = "/usr/share/fonts/truetype/crosextra/Carlito-Regular.ttf"
ITALIC_FONT_PATH = "/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf"

# Column centers (derived from PDF divider/clip positions)

CI_CENTER = 364.9 # CHECK-IN column
CO_CENTER = 448.0 # CHECK-OUT column
NIGHTS_CENTER = 545.5 # NIGHTS column

# ═══════════════════════════════════════════════════════════════════

# DATA MODEL

# ═══════════════════════════════════════════════════════════════════

@dataclass
class BookingData: # Dates
checkin_day: str
checkin_month: str
checkin_weekday: str
checkin_time: str
checkout_day: str
checkout_month: str
checkout_weekday: str
checkout_time: str
nights: str

    # Booking reference
    confirmation_number: str
    pin_code: str

    # Guest
    guest_name: str

    # Refund schedule (auto-calculated)
    refund_date_str: str   # e.g. "15 April 2026"

def booking_from_dates(
checkin_date: str, # "YYYY-MM-DD"
checkout_date: str, # "YYYY-MM-DD"
confirmation_number: str,
pin_code: str,
guest_name: str,
checkin_time: str = " 15:00 - 00:00",
checkout_time: str = " until 11:00",
) -> BookingData:
"""Create BookingData from date strings. Auto-calculates everything."""
ci = datetime.strptime(checkin_date, "%Y-%m-%d")
co = datetime.strptime(checkout_date, "%Y-%m-%d")

    # Refund date = check-in date (free cancel until 11:59 on day of arrival)
    refund_date_str = f"{ci.day} {ci.strftime('%B')} {ci.year}"

    return BookingData(
        checkin_day=str(ci.day),
        checkin_month=ci.strftime("%B").upper(),
        checkin_weekday=ci.strftime("%A"),
        checkin_time=checkin_time,
        checkout_day=str(co.day),
        checkout_month=co.strftime("%B").upper(),
        checkout_weekday=co.strftime("%A"),
        checkout_time=checkout_time,
        nights=str((co - ci).days),
        confirmation_number=confirmation_number,
        pin_code=pin_code,
        guest_name=guest_name.upper(),
        refund_date_str=refund_date_str,
    )

# ═══════════════════════════════════════════════════════════════════

# FONT METRICS (for centering calculations)

# ═══════════════════════════════════════════════════════════════════

class FontMetrics:
def **init**(self, font_path):
tt = TTFont(font_path)
self.cmap = tt.getBestCmap()
self.hmtx = tt['hmtx']
self.upem = tt['head'].unitsPerEm
self.\_tt = tt

    def text_width(self, text, font_size):
        total = 0
        for ch in text:
            g = self.cmap.get(ord(ch))
            if g and g in self.hmtx.metrics:
                total += self.hmtx.metrics[g][0]
        return (total / self.upem) * font_size

    def centered_x(self, text, font_size, center):
        return center - self.text_width(text, font_size) / 2

# ═══════════════════════════════════════════════════════════════════

# FONT REPLACEMENT (swap subsetted → full in PDF)

# ═══════════════════════════════════════════════════════════════════

# WinAnsiEncoding: codepoints 128-159 map to these Unicode values

# (standard Latin-1 and Unicode differ in this range)

WIN_ANSI_MAP = {
128: 0x20AC, # Euro sign
130: 0x201A, 131: 0x0192, 132: 0x201E, 133: 0x2026,
134: 0x2020, 135: 0x2021, 136: 0x02C6, 137: 0x2030,
138: 0x0160, 139: 0x2039, 140: 0x0152, 142: 0x017D,
145: 0x2018, 146: 0x2019, 147: 0x201C, 148: 0x201D,
149: 0x2022, # BULLET ← this is the critical one
150: 0x2013, 151: 0x2014, 152: 0x02DC, 153: 0x2122,
154: 0x0161, 155: 0x203A, 156: 0x0153, 158: 0x017E,
159: 0x0178,
}

def \_get_glyph_widths(font_path, first_char, last_char):
tt = TTFont(font_path)
cmap = tt.getBestCmap()
hmtx = tt['hmtx']
scale = 1000 / tt['head'].unitsPerEm
widths = []
for cc in range(first_char, last_char + 1): # Map through WinAnsiEncoding for the 128-159 range
unicode_cp = WIN_ANSI_MAP.get(cc, cc)
g = cmap.get(unicode_cp)
if g and g in hmtx.metrics:
widths.append(Decimal(str(round(hmtx.metrics[g][0] \* scale, 6))))
else:
widths.append(Decimal('0'))
tt.close()
return widths

def \_replace_font(pdf, font_dict, new_font_path):
with open(new_font_path, "rb") as f:
data = f.read()
fc = min(int(font_dict.get("/FirstChar", 32)), 32)
lc = max(int(font_dict.get("/LastChar", 126)), 126)
widths = \_get_glyph_widths(new_font_path, fc, lc)
font_dict[pikepdf.Name("/FirstChar")] = fc
font_dict[pikepdf.Name("/LastChar")] = lc
font_dict[pikepdf.Name("/Widths")] = pikepdf.Array(widths)
fd = font_dict.get("/FontDescriptor")
if fd:
s = pikepdf.Stream(pdf, data)
s[pikepdf.Name("/Length1")] = len(data)
fd[pikepdf.Name("/FontFile2")] = s

# ═══════════════════════════════════════════════════════════════════

# CONTENT STREAM EDITING HELPERS

# ═══════════════════════════════════════════════════════════════════

def \_esc(s):
"""Escape special chars for PDF string literals."""
return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

def \_replace_tm_and_tj(stream, old_tm_x, tm_y, old_text, new_text, new_x):
"""Replace (text)Tj AND update its preceding Tm x-coordinate."""
tm_pat = rf'({re.escape(old_tm_x)}\s+{re.escape(tm_y)}\s+Tm)'
tm_match = re.search(tm_pat, stream)
if not tm_match:
return stream.replace(f"({old_text})Tj", f"({\_esc(new_text)})Tj", 1)

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

def \_replace_tj_array_centered(stream, tj_pattern, new_text, tm_y, new_x):
"""Replace a TJ array (kerned) and update preceding Tm x-coordinate."""
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

def \_replace_weekday(stream, old_weekday, new_weekday, new_x, font_size):
"""Replace weekday Tj and recalculate its Td offset for centering."""
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

def \_replace_simple_text(stream, old_text, new_text, context=None):
"""Simple find-and-replace of (old)Tj → (new)Tj, optionally after context."""
old_tj = f"({old_text})Tj"
new_tj = f"({\_esc(new_text)})Tj"
if context:
idx = stream.find(context)
if idx >= 0:
tj_idx = stream.find(old_tj, idx)
if tj_idx >= 0:
return stream[:tj_idx] + new_tj + stream[tj_idx + len(old_tj):]
return stream.replace(old_tj, new_tj, 1)

def \_replace_tj_array_simple(stream, pattern, new_text):
"""Replace a TJ array without changing position."""
return re.sub(pattern, f"({\_esc(new_text)})Tj", stream, count=1)

# ═══════════════════════════════════════════════════════════════════

# MAIN EDITOR

# ═══════════════════════════════════════════════════════════════════

def edit_booking_pdf(template_path: str, output_path: str, booking: BookingData):
print(f"\n📄 Opening: {template_path}")
pdf = pikepdf.open(template_path)
page = pdf.pages[0]

    # ── 1. Replace font subsets with full fonts ──────────────────
    print("🔤 Replacing font subsets...")
    fonts = page["/Resources"]["/Font"]

    # Bold fonts: /TT0 (confirmation/PIN), /TT9 (months), /TT12 (day numbers)
    for name in ["/TT0", "/TT9", "/TT12"]:
        if name in fonts:
            _replace_font(pdf, fonts[name], BOLD_FONT_PATH)

    # Italic: /TT13 (weekdays)
    if "/TT13" in fonts:
        _replace_font(pdf, fonts["/TT13"], ITALIC_FONT_PATH)

    # Regular: /TT3 (refund text), /TT4 (guest name + amenities)
    for name in ["/TT3", "/TT4"]:
        if name in fonts:
            _replace_font(pdf, fonts[name], REGULAR_FONT_PATH)

    print("  ✓ Bold, Italic, Regular fonts → full character coverage")

    # ── 2. Calculate centered positions ──────────────────────────
    bold = FontMetrics(BOLD_FONT_PATH)
    italic = FontMetrics(ITALIC_FONT_PATH)

    ci_day_x   = bold.centered_x(booking.checkin_day, 19.5, CI_CENTER)
    co_day_x   = bold.centered_x(booking.checkout_day, 19.5, CO_CENTER)
    nights_x   = bold.centered_x(booking.nights, 19.5, NIGHTS_CENTER)
    ci_month_x = bold.centered_x(booking.checkin_month, 7.5, CI_CENTER)
    co_month_x = bold.centered_x(booking.checkout_month, 7.5, CO_CENTER)
    ci_wday_x  = italic.centered_x(booking.checkin_weekday, 7.5, CI_CENTER)
    co_wday_x  = italic.centered_x(booking.checkout_weekday, 7.5, CO_CENTER)

    # ── 3. Edit content stream ───────────────────────────────────
    print("\n✏️  Editing content stream...")
    contents = page["/Contents"]
    stream = contents.read_bytes().decode('latin-1')

    # --- Confirmation number ---
    # Original: [(5087.509)-3(.967)]TJ
    stream = _replace_tj_array_simple(
        stream,
        r'\[\(5087\.509\)-?\d*\s*\(\.967\)\]TJ',
        booking.confirmation_number,
    )
    print(f"  ✓ Confirmation: {booking.confirmation_number}")

    # --- PIN code ---
    # Original: (0751)Tj after "PIN C"
    stream = _replace_simple_text(stream, "0751", booking.pin_code, context="PIN C")
    print(f"  ✓ PIN: {booking.pin_code}")

    # --- Guest name ---
    # Original: [( CA)21(GRI ONCEK)]TJ after "Guest name:"
    stream = _replace_tj_array_simple(
        stream,
        r'\[\(\s*CA\)\d+\s*\(GRI ONCEK\)\]TJ',
        f" {booking.guest_name}",
    )
    print(f"  ✓ Guest name: {booking.guest_name}")

    # --- Check-in day (centered) ---
    stream = _replace_tm_and_tj(stream, "354.1875", "498.1125", "30", booking.checkin_day, ci_day_x)
    print(f"  ✓ CI day: {booking.checkin_day} (x={ci_day_x:.1f})")

    # --- Check-in month (centered) ---
    stream = _replace_tj_array_centered(
        stream, r'\[\(MAR\)\d+\s*\(CH\)\]TJ',
        booking.checkin_month, "486.6125", ci_month_x,
    )
    print(f"  ✓ CI month: {booking.checkin_month} (x={ci_month_x:.1f})")

    # --- Check-in weekday (centered via Td) ---
    stream = _replace_weekday(stream, "Monday", booking.checkin_weekday, ci_wday_x, 7.5)
    print(f"  ✓ CI weekday: {booking.checkin_weekday} (x={ci_wday_x:.1f})")

    # --- Check-in time (keep original x — anchored to clock icon) ---
    stream = _replace_tj_array_simple(
        stream,
        r'\[\(\s*15:0\)\d*\s*\(0 - 00\)\d*\s*\(:00\)\]TJ',
        booking.checkin_time,
    )
    print(f"  ✓ CI time: {booking.checkin_time.strip()}")

    # --- Check-out day (centered) ---
    stream = _replace_tm_and_tj(stream, "441.7625", "498.1125", "7", booking.checkout_day, co_day_x)
    print(f"  ✓ CO day: {booking.checkout_day} (x={co_day_x:.1f})")

    # --- Check-out month (centered) ---
    stream = _replace_tm_and_tj(stream, "436.8625", "486.6125", "APRIL", booking.checkout_month, co_month_x)
    print(f"  ✓ CO month: {booking.checkout_month} (x={co_month_x:.1f})")

    # --- Check-out weekday (centered via Td) ---
    stream = _replace_weekday(stream, "Tuesday", booking.checkout_weekday, co_wday_x, 7.5)
    print(f"  ✓ CO weekday: {booking.checkout_weekday} (x={co_wday_x:.1f})")

    # --- Check-out time (keep original x) ---
    stream = _replace_tj_array_simple(
        stream,
        r'\[\(\s*until 11\)\d*\s*\(:00\)\]TJ',
        booking.checkout_time,
    )
    print(f"  ✓ CO time: {booking.checkout_time.strip()}")

    # --- Nights (centered) ---
    stream = _replace_tm_and_tj(stream, "539.475", "498.1125", "8", booking.nights, nights_x)
    print(f"  ✓ Nights: {booking.nights} (x={nights_x:.1f})")

    # --- Refund schedule dates ---
    # Line 1: "...cancel before 11:59" — TJ array, replace with new date
    # Original: [(Y)88(ou'll get a full r)-3(efund if you cancel before 11:)3(59)]TJ
    new_refund_line1 = f"You'll get a full refund if you cancel before 11:59"
    stream = _replace_tj_array_simple(
        stream,
        r'\[\(Y\)88\s*\(ou\'ll get a full r\)-?\d*\s*\(efund if you cancel before 11:\)\d*\s*\(59\)\]TJ',
        new_refund_line1,
    )
    print(f"  ✓ Refund line 1 (static text preserved)")

    # Line 2: "on 30 March 2026. If you cancel from 12:00 on"
    old_refund_line2 = "on 30 March 2026. If you cancel from 12:00 on"
    new_refund_line2 = f"on {booking.refund_date_str}. If you cancel from 12:00 on"
    stream = _replace_simple_text(stream, old_refund_line2, new_refund_line2)
    print(f"  ✓ Refund line 2: {booking.refund_date_str}")

    # Line 3: "30 March 2026, you'll get a TL"
    old_refund_line3 = "30 March 2026, you'll get a TL"
    new_refund_line3 = f"{booking.refund_date_str}, you'll get a TL"
    stream = _replace_simple_text(stream, old_refund_line3, new_refund_line3)
    print(f"  ✓ Refund line 3: {booking.refund_date_str}")

    # ── 4. Write back and save ───────────────────────────────────
    contents.write(stream.encode('latin-1'))
    pdf.save(output_path)
    pdf.close()
    print(f"\n✅ Saved: {output_path}")

# ═══════════════════════════════════════════════════════════════════

# ENTRY POINT

# ═══════════════════════════════════════════════════════════════════

if **name** == "**main**":

    # ╔══════════════════════════════════════════════════════════╗
    # ║  CHANGE THESE VALUES FOR EACH BOOKING                   ║
    # ╚══════════════════════════════════════════════════════════╝

    booking = booking_from_dates(
        checkin_date="2026-04-15",
        checkout_date="2026-04-22",
        confirmation_number="6123.456.789",
        pin_code="1234",
        guest_name="Mehmet Yilmaz",
    )

    edit_booking_pdf(
        template_path="cabinn_apartments.pdf",
        output_path="edited_booking.pdf",
        booking=booking,
    )
