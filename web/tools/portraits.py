"""Copies the chosen generated portraits into assets/img/portraits as {id}-{base,alt,gold}.jpg (+ adv.jpg).
   gold = the base photo with a warm golden grade (the frame is drawn by the UI). Usage: python3 tools/portraits.py"""
import os, sys
from PIL import Image, ImageEnhance, ImageFilter
SRC = os.environ.get("SD_OUT", "/home/claude/sd/out")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "assets", "img", "portraits")
PICK = {"sci":"sci_303", "dip":"dip_404", "eco":"eco_404", "act":"act_606", "adv":"adv_303"}
ALT = {"sci":"alt_sci", "dip":"alt_dip", "eco":"alt_eco", "act":"alt_act"}
for k, v in [a.split("=") for a in sys.argv[1:]]: PICK[k] = v
def prep(name):
    im = Image.open(f"{SRC}/{name}.png").convert("RGB")
    im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
    return im
def gold(im):
    r, g, b = im.split()
    warm = Image.merge("RGB", (r.point(lambda x: min(255, x * 1.08 + 6)), g.point(lambda x: min(255, x * 1.02 + 3)), b.point(lambda x: x * .86)))
    return ImageEnhance.Contrast(warm).enhance(1.06)
for cid, name in PICK.items():
    im = prep(name)
    if cid == "adv": im.save(f"{OUT}/adv.jpg", quality=88); continue
    im.save(f"{OUT}/{cid}-base.jpg", quality=88)
    gold(im).save(f"{OUT}/{cid}-gold.jpg", quality=88)
    alt = ALT[cid]
    (prep(alt) if os.path.exists(f"{SRC}/{alt}.png") else ImageEnhance.Color(im).enhance(.75)).save(f"{OUT}/{cid}-alt.jpg", quality=88)
    print(cid, name, "alt:", alt if os.path.exists(f"{SRC}/{alt}.png") else "(placeholder)")
