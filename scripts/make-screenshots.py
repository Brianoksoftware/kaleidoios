#!/usr/bin/env python3
"""
Generates Apple App Store Connect screenshots for Prism Ring: Color Wheel Game.
Outputs 24-bit RGB PNGs (no alpha channel, required by App Store Connect):
- store-listing/screenshots-iphone/ (1284 x 2778 px — 6.5" iPhone Display)
- store-listing/screenshots-ipad/   (2048 x 2732 px — 13" iPad Pro Display)
"""

import math
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONT_BOLD = "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf"

HUES = [
    ("#FF4D6D", (255, 77, 109)),   # Rose
    ("#FFBE0B", (255, 190, 11)),   # Amber
    ("#70E000", (112, 224, 0)),    # Lime
    ("#00F5D4", (0, 245, 212)),    # Cyan
    ("#9B5DE5", (155, 93, 229)),   # Violet
    ("#F15BB5", (241, 91, 181)),   # Magenta
]


def fnt(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, int(size))


def draw_centered_text(draw: ImageDraw.ImageDraw, cx: float, cy: float, text: str, font: ImageFont.FreeTypeFont, fill, stroke_fill=None, stroke_width=0):
    bbox = draw.textbbox((0, 0), text, font=font, stroke_width=stroke_width)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    draw.text(
        (cx - w / 2 - bbox[0], cy - h / 2 - bbox[1]),
        text,
        font=font,
        fill=fill,
        stroke_fill=stroke_fill,
        stroke_width=stroke_width,
    )


def make_backdrop(w: int, h: int, accent_rgb=(155, 93, 229), fever=False) -> Image.Image:
    # Create smooth dark violet gradient with radial glow at low res then upscale smoothly
    sw, sh = w // 4, h // 4
    img = Image.new("RGB", (sw, sh), (10, 5, 20))
    px = img.load()
    cx, cy = sw * 0.5, sh * 0.54
    max_r = math.hypot(sw, sh) * 0.55
    ar, ag, ab = (255, 55, 95) if fever else accent_rgb
    for y in range(sh):
        t_y = y / sh
        br = int(16 * (1 - t_y) + 8 * t_y)
        bg = int(7 * (1 - t_y) + 4 * t_y)
        bb = int(32 * (1 - t_y) + 18 * t_y)
        for x in range(sw):
            d = math.hypot(x - cx, y - cy) / max_r
            glow = max(0.0, 1.0 - d * 1.35) ** 2.2 * (0.38 if fever else 0.25)
            r = min(255, int(br + ar * glow))
            g = min(255, int(bg + ag * glow))
            b = min(255, int(bb + ab * glow))
            px[x, y] = (r, g, b)
    return img.resize((w, h), Image.BICUBIC)


def draw_petal_ring(canvas: Image.Image, cx: int, cy: int, size: int, color_count: int, rotation_deg: float, highlight_idx: int, cracks: int, core_rgb, combo_text: str, sub_text: str, sparks, particles=None):
    # Supersample 2x for anti-aliased vector quality
    ss = 2
    box = int(size * 1.15)
    layer = Image.new("RGBA", (box * ss, box * ss), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    lcx = (box * ss) // 2
    lcy = (box * ss) // 2

    r_outer = int(size * 0.36 * ss)
    r_inner = int(size * 0.155 * ss)
    r_catch = int(size * 0.325 * ss)
    r_disc = r_outer + int(18 * ss)

    # Outer dashed guide ring
    r_guide = int(size * 0.47 * ss)
    for a in range(0, 360, 6):
        rad1 = math.radians(a)
        rad2 = math.radians(a + 2.5)
        d.line(
            [
                (lcx + math.cos(rad1) * r_guide, lcy + math.sin(rad1) * r_guide),
                (lcx + math.cos(rad2) * r_guide, lcy + math.sin(rad2) * r_guide),
            ],
            fill=(255, 255, 255, 24),
            width=max(2, ss),
        )

    # Dark glass disc
    d.ellipse([lcx - r_disc, lcy - r_disc, lcx + r_disc, lcy + r_disc], fill=(22, 10, 38, 245), outline=(255, 255, 255, 36), width=int(6 * ss))

    # Colored petals
    sector_deg = 360.0 / color_count
    gap_deg = sector_deg * 0.09
    for idx in range(color_count):
        start_a = rotation_deg + idx * sector_deg - sector_deg / 2 + gap_deg / 2
        end_a = rotation_deg + idx * sector_deg + sector_deg / 2 - gap_deg / 2
        pts = []
        steps = 36
        for s in range(steps + 1):
            ang = math.radians(start_a + (end_a - start_a) * (s / steps))
            pts.append((lcx + math.cos(ang) * r_outer, lcy + math.sin(ang) * r_outer))
        for s in range(steps, -1, -1):
            ang = math.radians(start_a + (end_a - start_a) * (s / steps))
            pts.append((lcx + math.cos(ang) * r_inner, lcy + math.sin(ang) * r_inner))
        rgb = HUES[idx][1]
        is_hi = idx == highlight_idx
        d.polygon(pts, fill=(*rgb, 255))
        d.line(pts + [pts[0]], fill=(255, 255, 255, 255 if is_hi else 90), width=int((4.5 if is_hi else 1.8) * ss), joint="curve")

    # Frost & Cracks if cracks > 0
    if cracks > 0:
        crack_angles = [-42, 135, 38][:cracks]
        for ca in crack_angles:
            rad = math.radians(ca)
            p0 = (lcx + math.cos(rad) * r_catch, lcy + math.sin(rad) * r_catch)
            p1 = (lcx + math.cos(rad + 0.08) * ((r_outer + r_inner) * 0.5), lcy + math.sin(rad + 0.08) * ((r_outer + r_inner) * 0.5))
            p2 = (lcx + math.cos(rad - 0.05) * r_inner, lcy + math.sin(rad - 0.05) * r_inner)
            p3 = (lcx + math.cos(rad + 0.16) * r_outer, lcy + math.sin(rad + 0.16) * r_outer)
            d.line([p3, p0, p1, p2], fill=(248, 252, 255, 235), width=int(3.2 * ss))
            # Branch
            pb = (lcx + math.cos(rad + 0.22) * (r_outer * 0.88), lcy + math.sin(rad + 0.22) * (r_outer * 0.88))
            d.line([p1, pb], fill=(180, 230, 255, 200), width=int(2.2 * ss))
        # Shockwave ring on first crack
        rad0 = math.radians(crack_angles[0])
        sx = lcx + math.cos(rad0) * r_catch
        sy = lcy + math.sin(rad0) * r_catch
        sr = int(size * 0.12 * ss)
        d.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], outline=(200, 240, 255, 190), width=int(2.5 * ss))

    # Inner hole & glowing core
    r_hole = r_inner - int(4 * ss)
    d.ellipse([lcx - r_hole, lcy - r_hole, lcx + r_hole, lcy + r_hole], fill=(20, 9, 35, 255), outline=(255, 255, 255, 35), width=int(1.5 * ss))
    r_core = int(r_inner * 0.60)
    d.ellipse([lcx - r_core - int(6 * ss), lcy - r_core - int(6 * ss), lcx + r_core + int(6 * ss), lcy + r_core + int(6 * ss)], outline=(*core_rgb, 110), width=int(2.5 * ss))
    d.ellipse([lcx - r_core, lcy - r_core, lcx + r_core, lcy + r_core], fill=(*core_rgb, 255))

    # Center combo text
    if combo_text:
        c_font = fnt(int(r_core * (0.72 if sub_text else 0.92)), True)
        draw_centered_text(d, lcx, lcy - (r_core * 0.18 if sub_text else 0), combo_text, c_font, (255, 255, 255, 255), (15, 6, 28, 180), int(2 * ss))
    if sub_text:
        s_font = fnt(int(r_core * 0.34), True)
        draw_centered_text(d, lcx, lcy + r_core * 0.38, sub_text, s_font, (255, 255, 255, 240), (15, 6, 28, 180), int(1.5 * ss))

    # Particles
    if particles:
        for px_ang, px_dist, px_rgb, px_rad in particles:
            ang = math.radians(px_ang)
            dist = px_dist * size * ss
            x = lcx + math.cos(ang) * dist
            y = lcy + math.sin(ang) * dist
            pr = int(px_rad * ss)
            d.ellipse([x - pr, y - pr, x + pr, y + pr], fill=(*px_rgb, 230))

    # Sparks
    for sp_ang, sp_dist, sp_rgb, sp_kind in sparks:
        ang = math.radians(sp_ang)
        dist = sp_dist * size * ss
        x = lcx + math.cos(ang) * dist
        y = lcy + math.sin(ang) * dist
        sr = int(14 * ss * (1.25 if sp_kind == "prism" else 1.0))
        # Glow halo
        hr = int(sr * 1.9)
        d.ellipse([x - hr, y - hr, x + hr, y + hr], fill=(*sp_rgb, 75))
        if sp_kind == "rush":
            pts = [(x, y - sr), (x + sr, y), (x, y + sr), (x - sr, y)]
            d.polygon(pts, fill=(*sp_rgb, 255), outline=(255, 255, 255, 230))
        else:
            d.ellipse([x - sr, y - sr, x + sr, y + sr], fill=(*sp_rgb, 255), outline=(255, 255, 255, 230), width=int(2.2 * ss))

    smooth = layer.resize((box, box), Image.LANCZOS)
    canvas.paste(smooth, (int(cx - box // 2), int(cy - box // 2)), smooth)


def draw_glass_card(canvas: Image.Image, x0: int, y0: int, x1: int, y1: int, radius: int, accent_rgb, fill_rgba=(22, 11, 38, 225)):
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill_rgba, outline=(*accent_rgb, 150), width=3)
    canvas.paste(layer, (0, 0), layer)


def draw_aso_header(canvas: Image.Image, w: int, top_y: int, badge: str, headline: str, subline: str, accent_rgb):
    d = ImageDraw.Draw(canvas)
    scale = w / 1284.0
    pill_w = int(360 * scale)
    pill_h = int(52 * scale)
    px0 = (w - pill_w) // 2
    py0 = top_y
    draw_glass_card(canvas, px0, py0, px0 + pill_w, py0 + pill_h, pill_h // 2, accent_rgb, (26, 12, 46, 235))
    draw_centered_text(d, w / 2, py0 + pill_h / 2, badge, fnt(int(22 * scale), True), accent_rgb)

    draw_centered_text(d, w / 2, py0 + pill_h + int(68 * scale), headline, fnt(int(58 * scale), True), (255, 255, 255))
    draw_centered_text(d, w / 2, py0 + pill_h + int(134 * scale), subline, fnt(int(30 * scale), False), (210, 200, 230))


def draw_hud(canvas: Image.Image, w: int, y0: int, card_w: int, score_str: str, best_str: str, tier_name: str, tier_rgb, cracks: int, progress: float, next_label: str):
    scale = card_w / 1080.0
    x0 = (w - card_w) // 2
    h = int(210 * scale)
    draw_glass_card(canvas, x0, y0, x0 + card_w, y0 + h, int(44 * scale), tier_rgb)
    d = ImageDraw.Draw(canvas)

    # Left: SCORE
    d.text((x0 + int(42 * scale), y0 + int(24 * scale)), "SCORE", font=fnt(int(21 * scale), True), fill=(165, 155, 185))
    d.text((x0 + int(42 * scale), y0 + int(54 * scale)), score_str, font=fnt(int(68 * scale), True), fill=(255, 255, 255))

    # Center: GLASS pips
    draw_centered_text(d, w / 2, y0 + int(36 * scale), "GLASS", fnt(int(21 * scale), True), (165, 155, 185))
    pip_gap = int(42 * scale)
    for i in range(3):
        px = w // 2 + (i - 1) * pip_gap
        py = y0 + int(88 * scale)
        pr = int(14 * scale)
        pts = [(px, py - pr), (px + pr, py), (px, py + pr), (px - pr, py)]
        if i < cracks:
            d.polygon(pts, fill=(45, 30, 65), outline=(120, 105, 145))
        else:
            d.polygon(pts, fill=(0, 245, 212), outline=(255, 255, 255))

    # Right: BEST + TIER chip
    rx = x0 + card_w - int(42 * scale)
    b_label = fnt(int(21 * scale), True)
    lw = d.textbbox((0, 0), "BEST", font=b_label)[2]
    d.text((rx - lw, y0 + int(24 * scale)), "BEST", font=b_label, fill=(165, 155, 185))

    b_val = fnt(int(40 * scale), True)
    vw = d.textbbox((0, 0), best_str, font=b_val)[2]
    d.text((rx - vw, y0 + int(54 * scale)), best_str, font=b_val, fill=(255, 255, 255))

    chip_w = int(150 * scale)
    chip_h = int(38 * scale)
    cx0 = rx - chip_w
    cy0 = y0 + int(106 * scale)
    d.rounded_rectangle([cx0, cy0, cx0 + chip_w, cy0 + chip_h], radius=chip_h // 2, fill=(32, 18, 52), outline=tier_rgb, width=2)
    draw_centered_text(d, cx0 + chip_w / 2, cy0 + chip_h / 2, tier_name, fnt(int(21 * scale), True), tier_rgb)

    # Progress bar row
    bar_x0 = x0 + int(42 * scale)
    bar_x1 = rx - int(220 * scale)
    bar_y = y0 + int(168 * scale)
    bar_h = int(12 * scale)
    d.rounded_rectangle([bar_x0, bar_y, bar_x1, bar_y + bar_h], radius=bar_h // 2, fill=(45, 32, 68))
    fill_x1 = bar_x0 + int((bar_x1 - bar_x0) * progress)
    d.rounded_rectangle([bar_x0, bar_y, fill_x1, bar_y + bar_h], radius=bar_h // 2, fill=tier_rgb)

    p_font = fnt(int(20 * scale), True)
    pw = d.textbbox((0, 0), next_label, font=p_font)[2]
    d.text((rx - pw, bar_y - int(6 * scale)), next_label, font=p_font, fill=(185, 175, 205))


def draw_rotate_icon(d: ImageDraw.ImageDraw, cx: float, cy: float, radius: float, direction: int, color=(20, 8, 36), width: int = 8):
    bbox = [cx - radius, cy - radius, cx + radius, cy + radius]
    if direction < 0:
        d.arc(bbox, start=210, end=120, fill=color, width=width)
        ax = cx + math.cos(math.radians(210)) * radius
        ay = cy + math.sin(math.radians(210)) * radius
        s = radius * 0.42
        d.polygon([(ax - s * 0.9, ay + s * 0.7), (ax - s * 0.1, ay - s * 0.9), (ax + s * 0.9, ay + s * 0.2)], fill=color)
    else:
        d.arc(bbox, start=60, end=330, fill=color, width=width)
        ax = cx + math.cos(math.radians(330)) * radius
        ay = cy + math.sin(math.radians(330)) * radius
        s = radius * 0.42
        d.polygon([(ax + s * 0.9, ay + s * 0.7), (ax + s * 0.1, ay - s * 0.9), (ax - s * 0.9, ay + s * 0.2)], fill=color)


def draw_dock(canvas: Image.Image, w: int, y0: int, card_w: int):
    scale = card_w / 1080.0
    x0 = (w - card_w) // 2
    h = int(214 * scale)
    draw_glass_card(canvas, x0, y0, x0 + card_w, y0 + h, int(56 * scale), (120, 90, 175))
    d = ImageDraw.Draw(canvas)

    btn_s = int(156 * scale)
    by0 = y0 + (h - btn_s) // 2
    # Left Cyan Spin Button
    lx0 = x0 + int(36 * scale)
    d.rounded_rectangle([lx0, by0, lx0 + btn_s, by0 + btn_s], radius=int(48 * scale), fill=(0, 245, 212), outline=(255, 255, 255), width=3)
    draw_rotate_icon(d, lx0 + btn_s / 2, by0 + btn_s / 2, btn_s * 0.27, -1, (20, 8, 36), max(4, int(9 * scale)))

    # Center Pause Button
    pr = int(58 * scale)
    d.ellipse([w // 2 - pr, y0 + h // 2 - pr, w // 2 + pr, y0 + h // 2 + pr], fill=(38, 22, 62), outline=(255, 255, 255, 90), width=2)
    bw = int(8 * scale)
    bh = int(34 * scale)
    d.rounded_rectangle([w // 2 - int(14 * scale), y0 + h // 2 - bh // 2, w // 2 - int(14 * scale) + bw, y0 + h // 2 + bh // 2], radius=3, fill=(255, 255, 255))
    d.rounded_rectangle([w // 2 + int(14 * scale) - bw, y0 + h // 2 - bh // 2, w // 2 + int(14 * scale), y0 + h // 2 + bh // 2], radius=3, fill=(255, 255, 255))

    # Right Rose Spin Button
    rx0 = x0 + card_w - int(36 * scale) - btn_s
    d.rounded_rectangle([rx0, by0, rx0 + btn_s, by0 + btn_s], radius=int(48 * scale), fill=(255, 77, 109), outline=(255, 255, 255), width=3)
    draw_rotate_icon(d, rx0 + btn_s / 2, by0 + btn_s / 2, btn_s * 0.27, 1, (20, 8, 36), max(4, int(9 * scale)))


def draw_stage_banner(canvas: Image.Image, w: int, y_center: int, text: str, accent_rgb):
    scale = w / 1284.0
    bw = int(420 * scale)
    bh = int(68 * scale)
    x0 = (w - bw) // 2
    y0 = int(y_center - bh // 2)
    draw_glass_card(canvas, x0, y0, x0 + bw, y0 + bh, bh // 2, accent_rgb, (16, 8, 30, 242))
    d = ImageDraw.Draw(canvas)
    draw_centered_text(d, w / 2, y_center, text, fnt(int(34 * scale), True), (255, 255, 255))


def render_gameplay_slide(w: int, h: int, cfg: dict) -> Image.Image:
    is_ipad = w > 1500
    card_w = int(w * (0.68 if is_ipad else 0.90))
    ring_size = int(w * (0.56 if is_ipad else 0.78))

    canvas = make_backdrop(w, h, cfg["accent"], fever=cfg.get("fever", False))
    top_y = int(h * 0.042)
    draw_aso_header(canvas, w, top_y, cfg["badge"], cfg["headline"], cfg["subline"], cfg["accent"])

    hud_y = int(h * 0.165)
    draw_hud(
        canvas,
        w,
        hud_y,
        card_w,
        cfg["score"],
        cfg["best"],
        cfg["tier"],
        cfg["accent"],
        cfg["cracks"],
        cfg["progress"],
        cfg["next_label"],
    )

    stage_cy = int(h * 0.555)
    draw_petal_ring(
        canvas,
        w // 2,
        stage_cy,
        ring_size,
        cfg["petals"],
        cfg["rotation"],
        cfg["highlight"],
        cfg["cracks"],
        cfg["core_rgb"],
        cfg["combo_text"],
        cfg["sub_text"],
        cfg["sparks"],
        cfg.get("particles"),
    )

    if cfg.get("banner"):
        draw_stage_banner(canvas, w, int(stage_cy - ring_size * 0.48), cfg["banner"], cfg["accent"])

    dock_y = int(h * 0.865)
    draw_dock(canvas, w, dock_y, card_w)
    return canvas


def render_menu_slide(w: int, h: int) -> Image.Image:
    is_ipad = w > 1500
    card_w = int(w * (0.64 if is_ipad else 0.88))
    scale = card_w / 1080.0
    canvas = make_backdrop(w, h, (0, 245, 212), fever=False)
    d = ImageDraw.Draw(canvas)

    top_y = int(h * 0.042)
    draw_aso_header(
        canvas,
        w,
        top_y,
        "6 TIERS OF MASTERY",
        "CLIMB TO ZENITH TIER",
        "Instant launch • Tactile haptics • Offline high scores",
        (255, 190, 11),
    )

    # Game Title inside screen
    title_y = int(h * 0.21)
    draw_centered_text(d, w / 2, title_y, "PRISM RING", fnt(int(88 * scale), True), (255, 255, 255))
    draw_centered_text(d, w / 2, title_y + int(68 * scale), "Spin the wheel. Chain the bloom.", fnt(int(30 * scale), False), (195, 185, 215))

    # Emblem ring
    emblem_size = int(w * (0.34 if is_ipad else 0.44))
    emblem_cy = int(h * 0.39)
    draw_petal_ring(
        canvas,
        w // 2,
        emblem_cy,
        emblem_size,
        6,
        -15,
        3,
        0,
        (255, 255, 255),
        "",
        "",
        [(0, 0.39, (255, 255, 255), "normal")],
    )

    # BEST score badge
    best_w = int(420 * scale)
    best_h = int(78 * scale)
    bx0 = (w - best_w) // 2
    by0 = int(emblem_cy + emblem_size * 0.43)
    draw_glass_card(canvas, bx0, by0, bx0 + best_w, by0 + best_h, best_h // 2, (255, 190, 11))
    draw_centered_text(d, w / 2, by0 + best_h / 2, "BEST   18,450", fnt(int(34 * scale), True), (255, 190, 11))

    # HOW TO PLAY card
    rules_y = by0 + best_h + int(34 * scale)
    rules_h = int(360 * scale)
    rx0 = (w - card_w) // 2
    draw_glass_card(canvas, rx0, rules_y, rx0 + card_w, rules_y + rules_h, int(44 * scale), (120, 95, 175))
    d.text((rx0 + int(44 * scale), rules_y + int(28 * scale)), "HOW TO PLAY", font=fnt(int(22 * scale), True), fill=(160, 150, 185))

    rules = [
        ((255, 77, 109), "Rotate the wheel so incoming sparks hit matching colors."),
        ((0, 245, 212), "Catch 3 of the same hue in a row to Bloom and clear sparks."),
        ((255, 190, 11), "Gold is wild. White slows time. Diamonds give 2× score."),
        ((255, 255, 255), "Mismatches crack the glass. 3 cracks end the run."),
    ]
    for idx, (col, txt) in enumerate(rules):
        ry = rules_y + int((84 + idx * 66) * scale)
        ir = int(16 * scale)
        ix = rx0 + int(62 * scale)
        d.ellipse([ix - ir, ry - ir, ix + ir, ry + ir], fill=col)
        d.text((ix + int(34 * scale), ry - int(18 * scale)), txt, font=fnt(int(26 * scale), False), fill=(240, 236, 250))

    # PLAY Glow Button
    play_y = rules_y + rules_h + int(38 * scale)
    play_h = int(128 * scale)
    d.rounded_rectangle([rx0, play_y, rx0 + card_w, play_y + play_h], radius=int(48 * scale), fill=(255, 77, 109), outline=(255, 215, 230), width=4)
    draw_centered_text(d, w / 2, play_y + play_h / 2, "PLAY", fnt(int(44 * scale), True), (255, 255, 255))

    # SOUND / HAPTICS toggles
    tog_y = play_y + play_h + int(26 * scale)
    tog_h = int(92 * scale)
    gap = int(24 * scale)
    tw = (card_w - gap) // 2
    draw_glass_card(canvas, rx0, tog_y, rx0 + tw, tog_y + tog_h, int(36 * scale), (0, 245, 212))
    draw_glass_card(canvas, rx0 + tw + gap, tog_y, rx0 + card_w, tog_y + tog_h, int(36 * scale), (0, 245, 212))
    draw_centered_text(d, rx0 + tw / 2, tog_y + tog_h / 2, "SOUND   ON", fnt(int(26 * scale), True), (0, 245, 212))
    draw_centered_text(d, rx0 + tw + gap + tw / 2, tog_y + tog_h / 2, "HAPTICS   ON", fnt(int(26 * scale), True), (0, 245, 212))

    return canvas


SLIDES = [
    (
        "01-spin-to-match.png",
        {
            "badge": "FAST REFLEX PUZZLE",
            "headline": "SPIN TO MATCH THE HUE",
            "subline": "Tap or swipe to rotate the glowing glass prism ring",
            "accent": (0, 245, 212),
            "score": "2,480",
            "best": "8,920",
            "tier": "PRISM",
            "cracks": 0,
            "progress": 0.62,
            "next_label": "31/40 • BLOOM",
            "petals": 5,
            "rotation": -18,
            "highlight": 3,
            "core_rgb": (0, 245, 212),
            "combo_text": "5×",
            "sub_text": "2/3",
            "sparks": [
                (-68, 0.37, (0, 245, 212), "normal"),
                (45, 0.44, (255, 77, 109), "normal"),
                (165, 0.48, (255, 190, 11), "rush"),
            ],
        },
    ),
    (
        "02-chain-bloom.png",
        {
            "badge": "3-OF-A-KIND CHAIN",
            "headline": "CHAIN 3 TO BLOOM",
            "subline": "Match 3 sparks of the same color to clear the board!",
            "accent": (255, 190, 11),
            "score": "5,940",
            "best": "8,920",
            "tier": "BLOOM",
            "cracks": 0,
            "progress": 0.78,
            "next_label": "54/60 • NOVA",
            "petals": 6,
            "rotation": 12,
            "highlight": 1,
            "core_rgb": (255, 190, 11),
            "combo_text": "7×",
            "sub_text": "3/3",
            "banner": "BLOOM +180",
            "sparks": [
                (-30, 0.38, (255, 229, 102), "rainbow"),
                (110, 0.45, (0, 245, 212), "normal"),
            ],
            "particles": [
                (ang, 0.28 + (ang % 3) * 0.05, HUES[ang % 6][1], 6 + (ang % 4))
                for ang in range(0, 360, 24)
            ],
        },
    ),
    (
        "03-fever-combos.png",
        {
            "badge": "8× STREAK OVERDRIVE",
            "headline": "IGNITE 2× FEVER MODE",
            "subline": "Build an 8× streak to double every point you score",
            "accent": (255, 77, 109),
            "fever": True,
            "score": "11,620",
            "best": "11,620",
            "tier": "NOVA",
            "cracks": 1,
            "progress": 0.85,
            "next_label": "78/85 • ZENITH",
            "petals": 6,
            "rotation": -36,
            "highlight": 0,
            "core_rgb": (255, 77, 109),
            "combo_text": "14×",
            "sub_text": "FEVER",
            "banner": "FEVER 2×",
            "sparks": [
                (-92, 0.36, (255, 77, 109), "rush"),
                (28, 0.42, (255, 229, 102), "rainbow"),
                (148, 0.46, (155, 93, 229), "normal"),
            ],
            "particles": [
                (ang, 0.33 + (ang % 2) * 0.04, (255, 77, 109), 5)
                for ang in range(15, 360, 30)
            ],
        },
    ),
    (
        "04-protect-glass.png",
        {
            "badge": "POWER SPARKS & RISK",
            "headline": "PROTECT THE GLASS RING",
            "subline": "Catch White Prism sparks to slow time before 3 cracks shatter!",
            "accent": (155, 93, 229),
            "score": "16,290",
            "best": "18,450",
            "tier": "ZENITH",
            "cracks": 2,
            "progress": 1.0,
            "next_label": "MAX TIER",
            "petals": 6,
            "rotation": 24,
            "highlight": 4,
            "core_rgb": (155, 93, 229),
            "combo_text": "9×",
            "sub_text": "2/3",
            "banner": "PRISM SLOW",
            "sparks": [
                (-50, 0.35, (244, 241, 255), "prism"),
                (75, 0.41, (0, 245, 212), "normal"),
                (195, 0.45, (241, 91, 181), "rush"),
            ],
        },
    ),
]


def main():
    targets = [
        ("store-listing/screenshots-iphone", 1284, 2778),
        ("store-listing/screenshots-ipad", 2048, 2732),
    ]
    for folder, w, h in targets:
        os.makedirs(folder, exist_ok=True)
        for filename, cfg in SLIDES:
            img = render_gameplay_slide(w, h, cfg)
            out_path = os.path.join(folder, filename)
            img.save(out_path, "PNG", optimize=True)
            print(f"Saved {out_path} ({w}x{h})")
        menu_img = render_menu_slide(w, h)
        menu_path = os.path.join(folder, "05-zenith-menu.png")
        menu_img.save(menu_path, "PNG", optimize=True)
        print(f"Saved {menu_path} ({w}x{h})")


if __name__ == "__main__":
    main()
