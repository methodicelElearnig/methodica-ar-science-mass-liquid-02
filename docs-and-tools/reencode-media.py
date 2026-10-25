#!/usr/bin/env python3
"""Optimization steps 1.8 / 1.9 — re-encode the unit's rasters and videos IN PLACE, keeping every
file's type (PNG stays PNG, JPG stays JPG, MP4 stays MP4; unit-owner decision 2026-10-22), and
write one MEDIA-CHANGES.md row per file.

Never shipped (docs-and-tools/ is outside the package allowlist). Run from the unit root:

    python -I docs-and-tools/reencode-media.py images [--dry-run] [--only NAME ...]
    python -I docs-and-tools/reencode-media.py videos [--dry-run] [--only NAME ...]

Rules (guide §15 + the unit owner's constraints):
  * target size = 2 x the largest box the file is drawn in (docs-and-tools/media-display-boxes.json,
    measured in the real pages, object-fit: cover assumed — the conservative reading), never upscaled;
    a shrink below 10 % is not worth a resample and is skipped
  * PNG: LANCZOS resize -> libimagequant 256-colour palette (dithered, alpha kept, quality floor 70 —
    an image that cannot reach it stays 24-bit, which is the banding guard for the photo-like
    panels) -> oxipng -o4 --strip safe
  * JPG: LANCZOS resize -> Pillow quality 82, progressive, optimize, EXIF dropped
  * MP4: ffmpeg libx264 crf 26 preset slow yuv420p +faststart, audio stripped (every <video> is muted),
    lanczos downscale to the 2 x box (even dimensions), fps kept
  * an output larger than its input is discarded (the input is kept, row says "kept (no gain)")
  * SVG is never touched (text, reviewed by hand)
"""
import json, os, re, shutil, subprocess, sys, tempfile
from pathlib import Path

from PIL import Image, ImageOps
import imagequant

ROOT = Path(__file__).resolve().parent.parent
UNIT = 'methodica-science-mass-liquid-02'
PARTS = [f'{UNIT}-0{n}' for n in range(1, 8)]
BOXES = json.loads((ROOT / 'docs-and-tools' / 'media-display-boxes.json').read_text('utf-8'))
ROWS_OUT = ROOT / 'docs-and-tools' / 'reencode-rows.md'

PNG_MIN_Q, PNG_MAX_Q, JPG_Q, X264_CRF = 70, 95, 82, 26
MIN_SHRINK = 0.90          # scale >= this: no resample
IMG_EXT = {'.png', '.jpg', '.jpeg'}


def asset_files(kind):
    out = []
    for p in [ROOT / part / 'assets' / kind for part in PARTS] + [ROOT / 'unit-assets' / kind]:
        if p.is_dir():
            out += sorted(x for x in p.iterdir() if x.is_file())
    return out


def target_scale(name, nat_w, nat_h, table):
    boxes = table.get(name)
    if not boxes:
        return 1.0, None
    s = max(max(bw / nat_w, bh / nat_h) for bw, bh in boxes)   # cover: the larger ratio
    biggest = max(boxes, key=lambda b: b[0] * b[1])
    return min(1.0, 2.0 * s), biggest


def even(n):
    return int(n) - (int(n) % 2)


def rel(p):
    return p.relative_to(ROOT).as_posix()


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(f'{cmd[0]} failed: {r.stderr[-800:]}')
    return r.stdout


def do_images(dry, only):
    rows, saved = [], 0
    for f in asset_files('img'):
        if f.suffix.lower() not in IMG_EXT or (only and f.name not in only):
            continue
        before = f.stat().st_size
        im = Image.open(f)
        im.load()
        nat = im.size
        scale, box = target_scale(f.name, *nat, BOXES)
        ops, params = [], []
        tmpdir = Path(tempfile.mkdtemp())
        out = tmpdir / f.name
        work = im
        if scale < MIN_SHRINK:
            new = (max(1, round(nat[0] * scale)), max(1, round(nat[1] * scale)))
            work = ImageOps.exif_transpose(im).resize(new, Image.LANCZOS)
            ops.append('resize'); params.append(f'LANCZOS {nat[0]}x{nat[1]} -> {new[0]}x{new[1]} (2 x box {box[0]}x{box[1]})')
        else:
            new = nat
        if f.suffix.lower() == '.png':
            rgba = work.convert('RGBA')
            try:
                q = imagequant.quantize_pil_image(rgba, dithering_level=1.0, max_colors=256, min_quality=PNG_MIN_Q, max_quality=PNG_MAX_Q)
                q.save(out, 'PNG', optimize=True)
                ops.append('quantize'); params.append(f'libimagequant 256 colours, dither 1.0, quality {PNG_MIN_Q}-{PNG_MAX_Q}')
            except RuntimeError:
                (rgba if im.mode in ('RGBA', 'LA', 'P') else work.convert('RGB')).save(out, 'PNG', optimize=True)
                params.append(f'palette refused below quality {PNG_MIN_Q}: kept 24-bit')
            run(['oxipng', '-o', '4', '--strip', 'safe', '-q', str(out)])
            params.append('oxipng -o4 --strip safe')
        else:
            work.convert('RGB').save(out, 'JPEG', quality=JPG_Q, optimize=True, progressive=True)
            ops.append('reencode'); params.append(f'Pillow JPEG q{JPG_Q} progressive optimize, EXIF dropped')
        after = out.stat().st_size
        op = '+'.join(ops) if ops else 'reencode'
        if after >= before:
            verdict = 'kept (no gain)'
            after_eff = before
        else:
            verdict = 'written'
            after_eff = after
            if not dry:
                shutil.copyfile(out, f)
        shutil.rmtree(tmpdir, ignore_errors=True)
        saved += before - after_eff
        boxtxt = f'{box[0]}x{box[1]} (measured in the page)' if box else 'not measured: native kept'
        rows.append(f'| # | {op} | `{rel(f)}` | `{rel(f)}` | {before:,} | {after_eff:,} | {nat[0]}x{nat[1]} | {new[0]}x{new[1]} | {boxtxt} | {"; ".join(params)} | {verdict} |')
        print(f'{rel(f):75} {before:>10,} -> {after_eff:>10,}  {op:18} {verdict}')
    ROWS_OUT.write_text('\n'.join(rows) + '\n', 'utf-8')
    print(f'\n{len(rows)} files, {saved:,} bytes saved{" (dry run — nothing written)" if dry else ""}; rows -> {rel(ROWS_OUT)}')


def probe(f):
    j = json.loads(run(['ffprobe', '-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', str(f)]))
    v = next(s for s in j['streams'] if s['codec_type'] == 'video')
    a = [s for s in j['streams'] if s['codec_type'] == 'audio']
    num, den = v['r_frame_rate'].split('/')
    return int(v['width']), int(v['height']), round(int(num) / int(den), 3), float(j['format']['duration']), bool(a), int(j['format'].get('bit_rate', 0))


def do_videos(dry, only):
    rows, saved = [], 0
    table = BOXES['_video']
    for f in asset_files('video'):
        if f.suffix.lower() != '.mp4' or (only and f.name not in only):
            continue
        before = f.stat().st_size
        w, h, fps, dur, audio, br = probe(f)
        boxes = table.get(f.name) or table['_default_character_clip']
        s = min(1.0, 2.0 * max(max(bw / w, bh / h) for bw, bh in boxes))
        box = max(boxes, key=lambda b: b[0] * b[1])
        tw, th = (even(w * s), even(h * s)) if s < MIN_SHRINK else (w, h)
        tmpdir = Path(tempfile.mkdtemp()); out = tmpdir / f.name
        vf = ['-vf', f'scale={tw}:{th}:flags=lanczos'] if (tw, th) != (w, h) else []
        cmd = ['ffmpeg', '-v', 'error', '-y', '-i', str(f), '-an', '-c:v', 'libx264', '-crf', str(X264_CRF), '-preset', 'slow',
               '-pix_fmt', 'yuv420p', '-movflags', '+faststart'] + vf + [str(out)]
        run(cmd)
        after = out.stat().st_size
        w2, h2, fps2, dur2, audio2, br2 = probe(out)
        if after >= before:
            verdict, after_eff = 'kept (no gain)', before
        else:
            verdict, after_eff = 'written', after
            if not dry:
                shutil.copyfile(out, f)
        shutil.rmtree(tmpdir, ignore_errors=True)
        saved += before - after_eff
        params = f'ffmpeg libx264 crf {X264_CRF} preset slow yuv420p +faststart -an' + (f' scale={tw}:{th} lanczos' if vf else '')
        rows.append(f'| # | reencode | `{rel(f)}` | `{rel(f)}` | {before:,} | {after_eff:,} | {w}x{h}, {fps} fps, {dur:.2f} s, {"AAC" if audio else "no audio"}, {br // 1000} kb/s | {w2}x{h2}, {fps2} fps, {dur2:.2f} s, {"audio" if audio2 else "no audio"}, {br2 // 1000} kb/s | {box[0]}x{box[1]} (measured in the page) | {params} | {verdict} |')
        print(f'{rel(f):75} {before:>10,} -> {after_eff:>10,}  {w}x{h}->{w2}x{h2} {"AAC" if audio else "-"} {verdict}')
    ROWS_OUT.write_text('\n'.join(rows) + '\n', 'utf-8')
    print(f'\n{len(rows)} files, {saved:,} bytes saved{" (dry run — nothing written)" if dry else ""}; rows -> {rel(ROWS_OUT)}')


if __name__ == '__main__':
    args = sys.argv[1:]
    if not args or args[0] not in ('images', 'videos'):
        sys.exit(__doc__)
    dry = '--dry-run' in args
    only = set(args[args.index('--only') + 1:]) if '--only' in args else set()
    only.discard('--dry-run')
    (do_images if args[0] == 'images' else do_videos)(dry, only)
