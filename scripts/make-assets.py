#!/usr/bin/env python3
"""
Génère les textures et ornements « skeuomorphic » du thème Drakensang
à partir de la palette de la maquette officielle (image de référence).

    python3 scripts/make-assets.py

Sortie : src/assets/theme/*.png|svg
"""
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'assets', 'theme')
os.makedirs(OUT, exist_ok=True)

INK = (10, 12, 18)
BRONZE = (176, 134, 62)
BRONZE_LIGHT = (222, 189, 118)
BRONZE_DARK = (86, 60, 27)
STEEL = (86, 116, 140)
STEEL_LIGHT = (150, 190, 214)
CRIMSON = (108, 18, 20)


def noise_layer(size, amount=18, blur=0):
    w, h = size
    img = Image.new('RGB', size)
    px = img.load()
    rnd = random.Random(7)
    for y in range(h):
        for x in range(w):
            v = 128 + rnd.randint(-amount, amount)
            px[x, y] = (v, v, v)
    if blur:
        img = img.filter(ImageFilter.GaussianBlur(blur))
    return img


def vgradient(size, stops):
    """stops = [(pos0..1, (r,g,b)), ...]"""
    w, h = size
    img = Image.new('RGB', size)
    draw = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(1, h - 1)
        # find bracketing stops
        for i in range(len(stops) - 1):
            p0, c0 = stops[i]
            p1, c1 = stops[i + 1]
            if p0 <= t <= p1:
                f = (t - p0) / max(1e-6, (p1 - p0))
                col = tuple(int(c0[j] + (c1[j] - c0[j]) * f) for j in range(3))
                draw.line([(0, y), (w, y)], fill=col)
                break
        else:
            draw.line([(0, y), (w, y)], fill=stops[-1][1])
    return img


def grain(img, amount=10):
    w, h = img.size
    n = noise_layer((w, h), amount, 0)
    return Image.blend(img.convert('RGB'), n, 0.10)


# ── 1. panneau de pierre sombre (fond des cartes) ────────────────────────────
def stone_panel():
    w, h = 256, 256
    base = vgradient((w, h), [(0, (26, 30, 38)), (0.5, (18, 21, 27)), (1, (12, 14, 19))])
    # taches de pierre
    draw = ImageDraw.Draw(base, 'RGBA')
    rnd = random.Random(11)
    for _ in range(140):
        x, y = rnd.randint(0, w), rnd.randint(0, h)
        r = rnd.randint(8, 46)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=(rnd.randint(30, 54), rnd.randint(32, 56), rnd.randint(38, 62), rnd.randint(6, 20)))
    base = base.filter(ImageFilter.GaussianBlur(3))
    base = grain(base, 12)
    base.save(os.path.join(OUT, 'stone.jpg'), quality=82)


# ── 2. plaque de bronze brossée (header / boutons) ──────────────────────────
def bronze_plate(name='bronze.jpg', crimson=False):
    w, h = 256, 128
    if crimson:
        stops = [(0, (86, 24, 24)), (0.35, (120, 28, 26)), (0.55, (62, 14, 16)), (1, (34, 9, 11))]
    else:
        stops = [(0, (150, 118, 62)), (0.28, (206, 172, 104)), (0.5, (168, 132, 70)), (0.78, (120, 88, 44)), (1, (66, 46, 22))]
    base = vgradient((w, h), stops)
    draw = ImageDraw.Draw(base, 'RGBA')
    rnd = random.Random(3)
    # stries du métal brossé
    for _ in range(260):
        y = rnd.randint(0, h)
        x0 = rnd.randint(0, w)
        x1 = x0 + rnd.randint(10, 120)
        a = rnd.randint(8, 34)
        col = (255, 240, 200, a) if not crimson else (255, 160, 140, a)
        draw.line([(x0, y), (x1, y + rnd.randint(-1, 1))], fill=col)
    base = base.filter(ImageFilter.GaussianBlur(0.4))
    base = grain(base, 8)
    base.save(os.path.join(OUT, name), quality=88)


# ── 3. bouton de navigation (bleu acier / vert / bronze) ────────────────────
def nav_button(name, dark, light, edge):
    w, h = 220, 46
    img = vgradient((w, h), [
        (0, tuple(min(255, int(c * 1.28)) for c in dark)),
        (0.08, light),
        (0.30, dark),
        (0.62, tuple(int(c * 0.82) for c in dark)),
        (0.86, dark),
        (1, tuple(int(c * 0.45) for c in dark)),
    ])
    # éclat horizontal (bombé du métal)
    gloss = Image.new('L', (w, h), 0)
    gd = ImageDraw.Draw(gloss)
    for y in range(h):
        t = y / (h - 1)
        v = int(150 * math.exp(-((t - 0.30) ** 2) / 0.012))
        gd.line([(0, y), (w, y)], fill=min(255, v))
    lite = Image.new('RGB', (w, h), (255, 255, 255))
    img = Image.composite(Image.blend(img, lite, 0.55), img, gloss)
    draw = ImageDraw.Draw(img, 'RGBA')
    # veines métalliques + rivets
    rnd = random.Random(19)
    for _ in range(90):
        y = rnd.randint(3, h - 5)
        x0 = rnd.randint(6, w - 6)
        draw.line([(x0, y), (x0 + rnd.randint(18, 70), y + rnd.choice([-1, 0, 0, 1]))],
                  fill=(255, 255, 255, rnd.randint(5, 22)))
    for x in (8, w - 9):
        for y in (8, h - 9):
            draw.ellipse([x - 2, y - 2, x + 2, y + 2], fill=(0, 0, 0, 120))
            draw.ellipse([x - 1.6, y - 1.8, x + 1.6, y + 1.4], fill=edge + (235,))
            draw.point((x, y - 1), fill=(255, 255, 255, 230))
    img = img.filter(ImageFilter.GaussianBlur(0.25))
    # cadre biseauté : clair en haut, sombre en bas
    frame = ImageDraw.Draw(img, 'RGBA')
    frame.rectangle([0, 0, w - 1, h - 1], outline=edge + (255,), width=2)
    frame.line([(1, 1), (w - 2, 1)], fill=(255, 255, 255, 160), width=1)
    frame.line([(1, h - 2), (w - 2, h - 2)], fill=(0, 0, 0, 190), width=1)
    frame.rectangle([2, 2, w - 3, h - 3], outline=(0, 0, 0, 150), width=1)
    frame.rectangle([3, 2, w - 4, h - 4], outline=tuple(int(c * 0.62) for c in edge) + (255,), width=1)
    img = grain(img, 5)
    img.save(os.path.join(OUT, name), quality=92)


# ── 4. fioriture / filigrane gravé (SVG) ────────────────────────────────────
FLORISH = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e8c98a"/>
      <stop offset="0.45" stop-color="#b0873e"/>
      <stop offset="1" stop-color="#5d4119"/>
    </linearGradient>
    <filter id="sh"><feDropShadow dx="0" dy="1" stdDeviation="0.6" flood-color="#000" flood-opacity="0.85"/></filter>
  </defs>
  <g fill="none" stroke="url(#g)" stroke-width="1.5" stroke-linecap="round" filter="url(#sh)">
    <path d="M2,{MID} C{W12},{MIDm32} {W20},{MIDp32} {W34},{MID}"/>
    <path d="M{Wm2},{MID} C{Wm12},{MIDm32} {Wm20},{MIDp32} {Wm34},{MID}"/>
    <path d="M{W34},{MID} L{W44},{MID}"/>
    <path d="M{Wm34},{MID} L{Wm44},{MID}"/>
    <circle cx="{W50}" cy="{MID}" r="{H20}" fill="#8e6a2c" stroke="#e8c98a" stroke-width="1.2"/>
    <path d="M{W50m4},{MID} l4,-4 l4,4 l-4,4 z" fill="#d9b96f" stroke="none"/>
  </g>
</svg>"""


def florish(name, w=360, h=26):
    with open(os.path.join(OUT, name), 'w', encoding='utf-8') as f:
        svg = (FLORISH
           .replace("{Wm12}", str(w - w * 0.12)).replace("{Wm20}", str(w - w * 0.2))
           .replace("{Wm34}", str(w - w * 0.34)).replace("{Wm44}", str(w - w * 0.44))
           .replace("{Wm2}", str(w - 2)).replace("{W50m4}", str(w * 0.5 - 4))
           .replace("{W12}", str(w * 0.12)).replace("{W20}", str(w * 0.2))
           .replace("{W34}", str(w * 0.34)).replace("{W44}", str(w * 0.44))
           .replace("{W50}", str(w * 0.5)).replace("{W}", str(w))
           .replace("{MIDm32}", str(h / 2 - h * 0.32)).replace("{MIDp32}", str(h / 2 + h * 0.32))
           .replace("{MID}", str(h / 2)).replace("{H20}", str(h * 0.2)).replace("{H}", str(h)))
        f.write(svg)


# ── 5. cadre ornemental (9-slice) ───────────────────────────────────────────
FRAME = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="b" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f0d79c"/><stop offset="0.35" stop-color="#c49a4e"/>
      <stop offset="0.65" stop-color="#8d6a2a"/><stop offset="1" stop-color="#4a3412"/>
    </linearGradient>
  </defs>
  <g fill="none" stroke="url(#b)" stroke-width="1.6">
    <rect x="1" y="1" width="118" height="118" rx="6"/>
    <rect x="4.5" y="4.5" width="111" height="111" rx="4" stroke-width="0.9" opacity="0.85"/>
    <rect x="8" y="8" width="104" height="104" rx="3" stroke-width="0.6" opacity="0.5"/>
  </g>
  <g stroke="url(#b)" stroke-width="1.4" fill="none">
    <path d="M10,20 q10,-10 20,0 q-10,-3 -20,0z"/>
    <path d="M110,20 q-10,-10 -20,0 q10,-3 20,0z"/>
    <path d="M10,100 q10,10 20,0 q-10,3 -20,0z"/>
    <path d="M110,100 q-10,10 -20,0 q10,3 20,0z"/>
  </g>
</svg>"""


# ── 6. texture de fond « mur de donjon » ────────────────────────────────────
def backdrop():
    w, h = 480, 480
    img = vgradient((w, h), [(0, (14, 17, 24)), (0.45, (9, 11, 16)), (1, (5, 6, 9))])
    draw = ImageDraw.Draw(img, 'RGBA')
    rnd = random.Random(23)
    # pierres
    y = 0
    row = 0
    while y < h:
        hh = rnd.randint(38, 62)
        x = -rnd.randint(0, 90)
        while x < w:
            ww = rnd.randint(70, 140)
            shade = rnd.randint(12, 26)
            draw.rectangle([x + 2, y + 2, x + ww - 2, y + hh - 2], fill=(shade, shade + 3, shade + 8, 255), outline=(0, 0, 0, 130))
            draw.line([(x + 3, y + 3), (x + ww - 3, y + 3)], fill=(70, 80, 96, 22))
            x += ww
        y += hh
        row += 1
    img = img.filter(ImageFilter.GaussianBlur(1.2))
    # halo de lumière en haut
    glow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for i in range(40):
        r = 240 - i * 4
        gd.ellipse([w / 2 - r * 1.8, -r * 0.9, w / 2 + r * 1.8, r * 0.9], fill=(255, 156, 60, 4))
    glow = glow.filter(ImageFilter.GaussianBlur(30))
    img = Image.alpha_composite(img.convert('RGBA'), glow).convert('RGB')
    img = grain(img, 7)
    img.save(os.path.join(OUT, 'backdrop.jpg'), quality=80)


# ── 7. braise / gemme (icône de section) ────────────────────────────────────
def ember(name='ember.png', color=(255, 138, 40), size=64):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for i in range(18, 0, -1):
        a = int(4 + (18 - i) * 2.4)
        r = size * 0.5 * i / 18
        d.ellipse([size / 2 - r, size / 2 - r, size / 2 + r, size / 2 + r], fill=color + (a,))
    img = img.filter(ImageFilter.GaussianBlur(size / 9))
    d = ImageDraw.Draw(img)
    d.ellipse([size * 0.38, size * 0.38, size * 0.62, size * 0.62], fill=(255, 236, 190, 235))
    d.ellipse([size * 0.44, size * 0.42, size * 0.56, size * 0.54], fill=color + (255,))
    img.save(os.path.join(OUT, name))


# ── 8. parchemin / plaque de titre ──────────────────────────────────────────
def title_plate(name='title-plate.png', w=760, h=54):
    img = vgradient((w, h), [(0, (150, 32, 24)), (0.2, (196, 60, 30)), (0.45, (126, 30, 20)), (0.8, (74, 18, 14)), (1, (40, 10, 9))])
    draw = ImageDraw.Draw(img, 'RGBA')
    rnd = random.Random(5)
    # veines de bois / cuir
    for _ in range(150):
        y = rnd.randint(0, h)
        draw.line([(rnd.randint(0, w), y), (rnd.randint(0, w), y)], fill=(255, 180, 110, rnd.randint(4, 16)))
    img = img.filter(ImageFilter.GaussianBlur(0.5))
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, w - 1, h - 1], outline=(212, 170, 92), width=2)
    draw.rectangle([1, 1, w - 2, h - 2], outline=(60, 18, 12), width=1)
    draw.line([(0, h - 2), (w, h - 2)], fill=(255, 214, 140, 120), width=1)
    img.save(os.path.join(OUT, name), quality=90)


# ── 9. drapeaux du sélecteur de langue ─────────────────────────────────────
FLAG_SRC = os.path.join(os.path.dirname(__file__), '..', 'DrakensangOptimizer', 'legacy', 'Images')


def flags():
    """Copie les drapeaux existants et dessine le drapeau algérien (arabe)."""
    dst = os.path.join(OUT, 'flags')
    os.makedirs(dst, exist_ok=True)
    for code in ('eng', 'fra', 'deu', 'esp'):
        src = os.path.join(FLAG_SRC, code + '.png')
        if os.path.exists(src):
            im = Image.open(src).convert('RGBA')
            im.save(os.path.join(dst, code + '.png'))

    # Algérie : deux bandes verticales verte / blanche + croissant et étoile rouges
    w, h = 120, 84
    im = Image.new('RGBA', (w, h), (255, 255, 255, 255))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, w // 2, h], fill=(0, 98, 51, 255))
    red = (210, 16, 52, 255)
    cx, cy, r = w * 0.44, h / 2, h * 0.30
    # croissant : disque rouge auquel on retranche un disque décalé (alpha)
    alpha = Image.new('L', (w, h), 0)
    ad = ImageDraw.Draw(alpha)
    ad.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    hole = Image.new('L', (w, h), 0)
    ImageDraw.Draw(hole).ellipse(
        [cx - r * 0.5, cy - r * 0.94, cx + r * 1.5, cy + r * 0.94], fill=255
    )
    from PIL import ImageChops
    alpha = ImageChops.subtract(alpha, hole)
    solid = Image.new('RGBA', (w, h), red)
    im.paste(solid, (0, 0), alpha)
    # étoile à 5 branches
    star = []
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5
        rad = r * (0.5 if i % 2 == 0 else 0.2)
        star.append((cx + r * 0.72 + math.cos(ang) * rad, cy + math.sin(ang) * rad))
    ImageDraw.Draw(im).polygon(star, fill=red)
    d.rectangle([0, 0, w - 1, h - 1], outline=(0, 0, 0, 110))
    im.save(os.path.join(dst, 'ara.png'))


if __name__ == '__main__':
    stone_panel()
    bronze_plate('bronze.jpg')
    bronze_plate('crimson.jpg', crimson=True)
    nav_button('btn-steel.png', (26, 62, 88), (108, 168, 202), (150, 190, 214))
    nav_button('btn-bronze.png', (96, 66, 26), (214, 172, 96), (240, 208, 140))
    nav_button('btn-green.png', (32, 74, 44), (126, 190, 120), (176, 220, 160))
    nav_button('btn-crimson.png', (92, 24, 22), (196, 84, 62), (232, 150, 120))
    florish('florish.svg')
    florish('florish-wide.svg', 720, 30)
    with open(os.path.join(OUT, 'frame.svg'), 'w', encoding='utf-8') as f:
        f.write(FRAME)
    backdrop()
    ember('ember.png')
    ember('ember-blue.png', (80, 160, 255))
    title_plate()
    flags()
    print('✔ assets written to', os.path.relpath(OUT))
