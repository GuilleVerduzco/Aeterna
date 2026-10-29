"""Æterna 'Sin rodeos' render engine: kinetic-type reels over silk + carousel slides."""
import os, subprocess, textwrap, json
from PIL import Image, ImageDraw, ImageFont, ImageFilter

F = '/home/claude/fonts/'
BG = '/home/claude/build/bg/'
OUT = '/home/claude/build/out/'
TMP = '/home/claude/build/tmp/'
os.makedirs(OUT, exist_ok=True); os.makedirs(TMP, exist_ok=True)

IVORY = (247, 241, 232, 255)
GOLD = (214, 178, 120, 255)
BLUSH = (233, 196, 190, 255)
WINE = (58, 14, 23, 255)
INK = (28, 10, 14, 255)

def font(k, size):
    return ImageFont.truetype(F + {'serif': 'IS.ttf', 'serifi': 'ISi.ttf', 'sans': 'MR4.ttf',
                                   'sansb': 'MR6.ttf', 'sansx': 'MR7.ttf', 'mono': 'JB.ttf'}[k] + '', size)

W, H = 1080, 1920

def text_png(path, text, fk, size, color, width=W, align='left', strike=None, track=0):
    """Render one line to a tight transparent PNG (full canvas width for easy x placement)."""
    f = font(fk, size)
    asc, desc = f.getmetrics()
    h = asc + desc + 12
    img = Image.new('RGBA', (width, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if track:
        x = 0
        tw = sum(f.getlength(c) + track for c in text) - track
    else:
        tw = f.getlength(text)
    x0 = {'left': 0, 'center': (width - tw) / 2, 'right': width - tw}[align]
    if track:
        x = x0
        for c in text:
            d.text((x, 6), c, font=f, fill=color); x += f.getlength(c) + track
    else:
        d.text((x0, 6), text, font=f, fill=color)
    if strike:
        # strike through a substring
        pre = text[:text.index(strike)]
        sx = x0 + f.getlength(pre); ex = sx + f.getlength(strike)
        y = 6 + asc * 0.62
        d.rectangle([sx - 4, y, ex + 4, y + max(3, size // 22)], fill=GOLD)
    img.save(path)
    return h

def wrap(text, fk, size, maxw):
    f = font(fk, size); words = text.split(); lines = []; cur = ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if f.getlength(t) <= maxw: cur = t
        else:
            lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

def vignette(path, dark=True):
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for y in range(H):
        # stronger at bottom & top
        a = 0
        if y < 420: a = int(150 * (1 - y / 420))
        if y > H - 900: a = max(a, int(205 * ((y - (H - 900)) / 900) ** 1.3))
        a = max(a, 70)
        col = (20, 4, 8, a) if dark else (250, 245, 238, int(a * 1.1))
        d.line([(0, y), (W, y)], fill=col)
    img.save(path)

def footer_png(path, dark=True):
    img = Image.new('RGBA', (W, 170), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    c = IVORY if dark else INK
    d.text((90, 30), 'Æterna', font=font('serif', 58), fill=c)
    lw = font('serif', 58).getlength('Æterna')
    d.ellipse([90 + lw + 6, 72, 90 + lw + 18, 84], fill=GOLD)
    d.text((92, 104), '4 BUSINESS  ·  AETERNA4.COM', font=font('mono', 22), fill=GOLD if dark else (140, 100, 60, 255))
    d.line([(W - 200, 70), (W - 90, 70)], fill=GOLD, width=2)
    img.save(path)

def slideup(idx, st, dur=0.55, dy=40):
    """y offset expression for an ease-out slide-up starting at st."""
    p = f"min(max((t-{st})/{dur},0),1)"
    return f"{dy}*(1-{p})*(1-{p})"

def render_reel(r):
    """r: dict id, dur, bg, ss, theme('wine'|'ivory'), scenes:[{t0,t1,kicker,lines:[..],size,strike}], cta"""
    rid = r['id']; dur = r['dur']; dark = r.get('theme', 'wine') == 'wine'
    tdir = TMP + rid + '/'; os.makedirs(tdir, exist_ok=True)
    inputs = []; graph = []; layers = []
    vig = tdir + 'vig.png'; vignette(vig, dark); inputs.append(vig)
    foot = tdir + 'foot.png'; footer_png(foot, dark); inputs.append(foot)
    txt = IVORY if dark else INK
    acc = GOLD if dark else (150, 40, 58, 255)
    # build per-scene elements
    for si, s in enumerate(r['scenes']):
        t0, t1 = s['t0'], s['t1']
        size = s.get('size', 112)
        fk = s.get('font', 'serif')
        lines = list(s['lines'])
        # shrink-to-fit: keep authored line breaks, never orphan words
        while size > 60 and any(font('serifi' if L.startswith('_') else fk, size).getlength(L.lstrip('_*~')) > W - 180 for L in lines):
            size -= 4
        lh = int(size * 1.08)
        block = len(lines) * lh
        ytop = s.get('y', int(H * 0.44 - block / 2))
        if s.get('kicker'):
            p = tdir + f's{si}k.png'; text_png(p, s['kicker'].upper(), 'mono', 30, acc, track=4)
            layers.append((p, 90, ytop - 90, t0, t1, 0.0))
        for li, L in enumerate(lines):
            p = tdir + f's{si}l{li}.png'
            italic = L.startswith('_'); hl = L.startswith('*')
            clean = L.lstrip('_*~')
            col = acc if hl else txt
            text_png(p, clean, 'serifi' if italic else fk, size, col if not italic else (BLUSH if dark else acc),
                     strike=s.get('strike') if s.get('strike') and s.get('strike') in clean else None)
            layers.append((p, 90, ytop + li * lh, t0 + 0.12 + li * 0.16, t1, 0))
        if s.get('sub'):
            sl = wrap(s['sub'], 'sansb', 40, W - 200)
            for j, L in enumerate(sl):
                p = tdir + f's{si}sub{j}.png'; text_png(p, L, 'sansb', 40, BLUSH if dark else (90, 50, 55, 255))
                layers.append((p, 92, ytop + block + 50 + j * 56, t0 + 0.4 + len(lines) * 0.16, t1, 0))
        if s.get('button'):
            p = tdir + f's{si}btn.png'
            f = font('sansx', 38); tw = f.getlength(s['button'])
            img = Image.new('RGBA', (W, 120), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
            d.rounded_rectangle([90, 10, 90 + tw + 90, 104], radius=47, fill=GOLD)
            d.text((135, 32), s['button'], font=f, fill=INK); img.save(p)
            layers.append((p, 0, s.get('btn_y', ytop + block + 200), t0 + 0.7, t1, 0))
    # ffmpeg graph
    bgfile = BG + ('wine_' if dark else 'ivory_') + r.get('bg', 'b') + '.mp4'
    cmd = ['ffmpeg', '-v', 'error', '-y', '-stream_loop', '-1', '-ss', str(r.get('ss', 0)), '-i', bgfile]
    allimgs = [vig, foot] + [l[0] for l in layers]
    for p in allimgs:
        cmd += ['-loop', '1', '-t', str(dur), '-i', p]
    cmd += ['-f', 'lavfi', '-t', str(dur), '-i', 'anullsrc=r=44100:cl=stereo']
    fx = '[0:v]trim=0:%s,setpts=PTS-STARTPTS,fps=30%s,format=yuva420p[b0];' % (dur, ',hflip' if r.get('flip') else '')
    fx += '[1:v]format=rgba[vg];[b0][vg]overlay=0:0[b1];'
    fx += '[2:v]format=rgba,fade=in:st=0.2:d=0.6:alpha=1[ft];[b1][ft]overlay=0:%d[b2];' % (H - 230)
    cur = 'b2'
    for i, (p, x, y, st, en, _) in enumerate(layers):
        k = i + 3
        fo = min(en - 0.35, dur - 0.05)
        fx += f'[{k}:v]format=rgba,fade=in:st={st:.2f}:d=0.45:alpha=1,fade=out:st={fo:.2f}:d=0.3:alpha=1[e{i}];'
        fx += f"[{cur}][e{i}]overlay=x={x}:y='{y}+{slideup(i, st)}':enable='between(t,{st:.2f},{en:.2f})'[c{i}];"
        cur = f'c{i}'
    fx += f'[{cur}]fade=in:st=0:d=0.25,format=yuv420p[vout]'
    na = len(allimgs) + 1
    cmd += ['-filter_complex', fx, '-map', '[vout]', '-map', f'{na}:a', '-t', str(dur),
            '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p', '-r', '30',
            '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', OUT + rid + '.mp4']
    subprocess.run(cmd, check=True)
    # cover frame
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(r.get('cover_t', min(2.2, dur - 1))), '-i', OUT + rid + '.mp4',
                    '-frames:v', '1', '-q:v', '3', OUT + rid + '_cover.jpg'], check=True)
    return OUT + rid + '.mp4'

# ---------- carousel slides ----------
def still(theme, src='b', t=4.0, flip=False):
    p = TMP + f'still_{theme}_{src}_{t}_{int(flip)}.png'
    if not os.path.exists(p):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t), '-i', BG + f'{theme}_{src}.mp4', '-frames:v', '1',
                        '-vf', 'crop=1080:1350:0:285' + (',hflip' if flip else ''), p], check=True)
    return p

def slide(path, theme, kicker, title, body=None, n=None, total=None, src='b', t=4.0, flip=False, cta=None, big=None):
    dark = theme == 'wine'
    base = Image.open(still(theme, src, t, flip)).convert('RGBA')
    ov = Image.new('RGBA', base.size, (20, 4, 8, 150) if dark else (250, 246, 240, 175))
    img = Image.alpha_composite(base, ov); d = ImageDraw.Draw(img)
    txt = IVORY if dark else INK; acc = GOLD if dark else (150, 40, 58, 255); sub = BLUSH if dark else (90, 50, 55, 255)
    # header
    d.text((90, 90), kicker.upper(), font=font('mono', 26), fill=acc)
    if n: d.text((990 - font('mono', 26).getlength(f'{n}/{total}'), 90), f'{n}/{total}', font=font('mono', 26), fill=acc)
    y = 260
    if big:
        d.text((86, 200), big, font=font('serif', 300), fill=acc); y = 560
    size = 128 if len(title) < 34 else (112 if len(title) < 52 else 96)
    if not big: y = 330
    for L in wrap(title, 'serif', size, 900):
        if L.startswith('_'): pass
        d.text((90, y), L, font=font('serif', size), fill=txt); y += int(size * 1.08)
    if body:
        y += 40; d.line([(92, y), (180, y)], fill=acc, width=3); y += 40
        for para in body.split('\n'):
            for L in wrap(para, 'sans', 46, 880):
                d.text((92, y), L, font=font('sans', 46), fill=sub); y += 64
            y += 18
    if cta:
        f = font('sansx', 36); tw = f.getlength(cta)
        d.rounded_rectangle([90, 1090, 90 + tw + 80, 1180], radius=45, fill=GOLD)
        d.text((130, 1112), cta, font=f, fill=INK)
    # footer
    d.text((90, 1236), 'Æterna', font=font('serif', 44), fill=txt)
    lw = font('serif', 44).getlength('Æterna'); d.ellipse([90 + lw + 5, 1268, 90 + lw + 15, 1278], fill=GOLD)
    d.text((620, 1258), 'AETERNA4.COM', font=font('mono', 22), fill=acc)
    img.convert('RGB').save(path, quality=92)
