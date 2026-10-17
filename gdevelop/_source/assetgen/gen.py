import json, base64, os, sys
from playwright.sync_api import sync_playwright
OUT = "/home/claude/p2050/out/assets"
LUC = json.load(open("/home/claude/src/lucide.json"))
def save(path, durl):
    b = base64.b64decode(durl.split(",",1)[1]); open(path, "wb").write(b)
with sync_playwright() as p:
    br = p.chromium.launch()
    pg = br.new_page()
    pg.goto("file:///home/claude/p2050/assetgen/gen.html")
    m = pg.evaluate("genMap()")
    for k, v in m["regions"].items(): save(f"{OUT}/map/region-{k}.png", v["png"]); v.pop("png")
    for k, v in m["lines"].items(): save(f"{OUT}/map/line-{k}.png", v["png"]); v.pop("png")
    save(f"{OUT}/map/ocean.png", m["ocean"]["png"]); m["ocean"].pop("png")
    save(f"{OUT}/map/ice.png", m["ice"]["png"]); m["ice"].pop("png")
    save(f"{OUT}/map/rim.png", m["rim"]["png"]); m.pop("rim")
    json.dump(m, open("/home/claude/p2050/assetgen/mapmeta.json", "w"))
    ic = pg.evaluate("(L) => genIcons(L, 64)", LUC)
    for k, v in ic.items():
        if v: save(f"{OUT}/icons/{k}.png", v)
        else: print("icon fail", k)
    sp = pg.evaluate("(L) => genSprites(L)", LUC)
    save(f"{OUT}/ui/glow.png", sp["glow"]); save(f"{OUT}/ui/backdrop.jpg", sp["backdrop"])
    save(f"{OUT}/ui/bubble-green.png", sp["bubGreen"]); save(f"{OUT}/ui/bubble-red.png", sp["bubRed"])
    br.close()
print(json.dumps(m["meta"]), {k: v["bbox"] for k, v in m["regions"].items()}, m["grid"]["w"], m["grid"]["h"], len(m["grid"]["rle"]))
