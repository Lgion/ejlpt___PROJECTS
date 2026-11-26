from __future__ import annotations

import argparse
import base64
import json
import os
from typing import Any, Dict, List, Tuple

from PIL import Image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_THUMB_DIR = os.path.join(BASE_DIR, '_docs', 'batch_state', 'thumbnails')
DEFAULT_SPRITES_DIR = os.path.join(BASE_DIR, 'public', 'sprites')
DATA_DIR = os.path.join(BASE_DIR, 'public', 'data')


def decode_item_key_from_filename(filename: str) -> str:
    stem = os.path.splitext(filename)[0]
    pad = '=' * (-len(stem) % 4)
    try:
        return base64.urlsafe_b64decode(stem + pad).decode('utf-8')
    except Exception:
        return stem


def fit_square_thumbnail(src_path: str, cell_size: int) -> Image.Image:
    with Image.open(src_path) as img:
        rgb = img.convert('RGBA')
        w, h = rgb.size
        side = min(w, h)
        left = (w - side) // 2
        top = (h - side) // 2
        cropped = rgb.crop((left, top, left + side, top + side))
        resampling = getattr(Image, 'Resampling', Image)
        return cropped.resize((cell_size, cell_size), resampling.LANCZOS)


def compile_sprite_sheets(
    thumb_dir: str = DEFAULT_THUMB_DIR,
    output_dir: str = DEFAULT_SPRITES_DIR,
    cell_size: int = 128,
    cols: int = 16,
    rows: int = 16,
    quality: int = 82,
) -> Dict[str, Any]:
    os.makedirs(output_dir, exist_ok=True)
    per_sheet = cols * rows
    manifest: Dict[str, Any] = {
        'version': 1,
        'cellSize': cell_size,
        'cols': cols,
        'rows': rows,
        'sheets': {},
        'items': {},
    }

    if not os.path.exists(thumb_dir):
        manifest_path = os.path.join(output_dir, 'manifest.json')
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)
        return manifest

    grouped_files: Dict[str, List[Tuple[str, str]]] = {}
    for root, _, files in os.walk(thumb_dir):
        rel = os.path.relpath(root, thumb_dir)
        group = 'general' if rel == '.' else rel.replace(os.sep, '-')
        for fn in sorted(files):
            if fn.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                item_key = decode_item_key_from_filename(fn)
                grouped_files.setdefault(group, []).append((item_key, os.path.join(root, fn)))

    for group, entries in grouped_files.items():
        for page_idx in range(0, len(entries), per_sheet):
            chunk = entries[page_idx : page_idx + per_sheet]
            sheet_id = f'{group}-{page_idx // per_sheet}'
            sheet_filename = f'{sheet_id}.webp'
            sheet_path = os.path.join(output_dir, sheet_filename)
            canvas = Image.new('RGBA', (cols * cell_size, rows * cell_size), (0, 0, 0, 0))

            for idx, (item_key, img_path) in enumerate(chunk):
                try:
                    tile = fit_square_thumbnail(img_path, cell_size)
                except Exception:
                    continue
                x = (idx % cols) * cell_size
                y = (idx // cols) * cell_size
                canvas.paste(tile, (x, y))
                manifest['items'].setdefault(item_key, []).append({
                    'sheet': sheet_id,
                    'index': idx,
                    'source': 'cdn',
                })

            canvas.save(sheet_path, format='WEBP', quality=quality, method=4)
            manifest['sheets'][sheet_id] = {
                'url': f'/sprites/{sheet_filename}',
                'cols': cols,
                'rows': rows,
                'count': len(chunk),
            }

    manifest_path = os.path.join(output_dir, 'manifest.json')
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    return manifest


def inject_manifest_into_datasets(manifest: Dict[str, Any]) -> int:
    items_map: Dict[str, List[Dict[str, Any]]] = manifest.get('items', {})
    if not items_map:
        return 0

    updated = 0
    targets = [
        ('kanjiDatabase_unified.json', 'kanji', 'kanji'),
        ('jukugo_unified.json', 'jukugo', 'word'),
        ('slang_unified.json', 'slang', 'term'),
        ('onomatopoeia_unified.json', 'ono', 'term'),
    ]

    for filename, kind, key_col in targets:
        path = os.path.join(DATA_DIR, filename)
        if not os.path.exists(path):
            continue
        with open(path, 'r', encoding='utf-8') as f:
            doc = json.load(f)
        keys = list(doc['schema'].keys()) if isinstance(doc['schema'], dict) else list(doc['schema'])
        if 'images' not in keys or key_col not in keys:
            continue
        k_idx = keys.index(key_col)
        img_idx = keys.index('images')
        changed = False
        for row in doc['data']:
            lookup = f'{kind}:{row[k_idx]}'
            if lookup in items_map:
                row[img_idx] = items_map[lookup]
                changed = True
                updated += 1
        if changed:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(doc, f, ensure_ascii=False, separators=(',', ':'))
    return updated


def main() -> None:
    parser = argparse.ArgumentParser(description='Compile thumbnails into WebP sprite sheets')
    parser.add_argument('--thumb-dir', default=DEFAULT_THUMB_DIR)
    parser.add_argument('--output-dir', default=DEFAULT_SPRITES_DIR)
    parser.add_argument('--cell-size', type=int, default=128)
    args = parser.parse_args()

    manifest = compile_sprite_sheets(
        thumb_dir=args.thumb_dir,
        output_dir=args.output_dir,
        cell_size=args.cell_size,
    )
    injected = inject_manifest_into_datasets(manifest)
    print(f'[Sprites] sheets={len(manifest["sheets"])}, items={len(manifest["items"])}, injected={injected}')


if __name__ == '__main__':
    main()
