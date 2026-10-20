"""Builds the image textures from NASA public-domain imagery (see public/CREDITS.txt).
   Inputs (downloaded once into TEX): Blue Marble Next Generation (topo+bathy and plain), Black Marble 2016, cloud_combined_8192.
   Outputs (public/img): globe-day/-night/-clouds/-water (3D home globe), map-day/-night/-paint (2D game map, Robinson).
   Run: python3 tools/make-textures.py"""
import numpy as np, os, sys
from PIL import Image, ImageFilter, ImageEnhance
Image.MAX_IMAGE_PIXELS = None
TEX = os.environ.get("TEX", "/home/claude/tex")
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "assets", "img")
os.makedirs(OUT, exist_ok=True)

day = Image.open(f"{TEX}/world.topo.bathy.200408.3x5400x2700.jpg").convert("RGB")
plain = Image.open(f"{TEX}/world.200412.3x5400x2700.jpg").convert("RGB")
night = Image.open(f"{TEX}/BlackMarble_2016_3km.jpg").convert("RGB").resize((5400, 2700), Image.LANCZOS)
clouds = Image.open(f"{TEX}/cloud_combined_8192.tif").convert("L")

# water mask: the plain Blue Marble has one flat ocean colour
pa = np.asarray(plain).astype(np.int16)
oc = np.array([10, 10, 51])
water = (np.abs(pa - oc).sum(axis=2) < 40).astype(np.uint8) * 255
water = Image.fromarray(water).filter(ImageFilter.MedianFilter(3))

def save(im, name, size, q=86):
    im.resize(size, Image.LANCZOS).save(f"{OUT}/{name}", quality=q, optimize=True, progressive=True)
    print(name, size, os.path.getsize(f"{OUT}/{name}") // 1024, "KB")

# ---- globe (equirectangular) ----
for w, tag in ((4096, ""), (2048, "-s")):
    save(day, f"globe-day{tag}.jpg", (w, w // 2))
    save(night, f"globe-night{tag}.jpg", (w, w // 2), 82)
    save(clouds, f"globe-clouds{tag}.jpg", (w, w // 2), 80)
    save(water, f"globe-water{tag}.jpg", (w // 2, w // 4), 80)

# ---- 2D map (Robinson) ----
grid = np.fromfile(f"{HERE}/.cache/latlon-4800x2394.f32", dtype=np.float32).reshape(2394, 4800, 2)
lon, lat = grid[..., 0], grid[..., 1]
valid = ~np.isnan(lon)
lonw = np.where(valid, ((lon + 180) % 360), 0)
latw = np.where(valid, lat, 0)

def sample(img):
    a = np.asarray(img).astype(np.float32)
    h, w = a.shape[:2]
    x = lonw / 360 * w - .5
    y = (90 - latw) / 180 * h - .5
    x0 = np.floor(x).astype(int); y0 = np.clip(np.floor(y).astype(int), 0, h - 1)
    fx = (x - x0)[..., None]; fy = (y - y0)[..., None]
    x0m = x0 % w; x1 = (x0 + 1) % w; y1 = np.clip(y0 + 1, 0, h - 1)
    if a.ndim == 2: a = a[..., None]
    v = (a[y0, x0m] * (1 - fx) * (1 - fy) + a[y0, x1] * fx * (1 - fy) + a[y1, x0m] * (1 - fx) * fy + a[y1, x1] * fx * fy)
    return v

BG = np.array([6, 16, 21], np.float32)
def finish(v, name, grade):
    v = grade(v)
    v = np.where(valid[..., None], v, BG)
    im = Image.fromarray(np.clip(v, 0, 255).astype(np.uint8))
    for w, tag in ((4800, ""), (2400, "-s")):
        save(im, f"{name}{tag}.jpg", (w, round(w * 2394 / 4800)), 84 if w > 3000 else 82)

wm = sample(water)[..., 0:1] / 255   # 1 = sea

def grade_day(v):
    # calmer, slightly darker satellite look so the UI stays readable; deep teal-navy seas
    lum = v.mean(axis=2, keepdims=True)
    v = v * .78 + lum * .22                       # desaturate a little
    land = v * 0.86
    sea = v * np.array([.62, .78, .95]) + np.array([4, 14, 26])
    return land * (1 - wm) + sea * wm

def grade_night(v):
    v = np.power(v / 255, 1.15) * 255
    sea = v * .5 + np.array([3, 8, 16])
    return v * 1.05 * (1 - wm) + sea * wm

def grade_paint(v):
    lum = v.mean(axis=2, keepdims=True)
    v = v * .55 + lum * .45
    v = v * .6 + 255 * .35
    land = v * np.array([1.0, 1.0, .9])
    sea = np.array([150, 196, 214], np.float32) * .9 + v * .1
    return land * (1 - wm) + sea * wm

dv = sample(day); finish(dv, "map-day", grade_day)
nv = sample(night); finish(nv, "map-night", grade_night)
pv = np.asarray(Image.fromarray(np.clip(dv, 0, 255).astype(np.uint8)).filter(ImageFilter.ModeFilter(7)).filter(ImageFilter.SMOOTH_MORE)).astype(np.float32)
finish(pv, "map-paint", grade_paint)
