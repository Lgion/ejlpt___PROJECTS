from __future__ import annotations

import argparse
import base64
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Callable, Dict, List, Optional

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'public', 'data')
STATE_DIR = os.path.join(BASE_DIR, '_docs', 'batch_state')
THUMB_DIR = os.path.join(STATE_DIR, 'thumbnails')
QUEUE_FILE = os.path.join(STATE_DIR, 'image_gen_queue.json')

SIMPLE_CATEGORIES = {
    'nature', 'animaux', 'animauxetnature', 'couleurs', 'nourriture', 'aliments',
    'corps', 'objets', 'transports', 'vetements', 'lieux', 'famille', 'meteo',
    'tempsetnumeros', 'plante', 'plantes',
}

SIMPLE_KEYWORDS = {
    'cat', 'dog', 'bird', 'fish', 'horse', 'cow', 'pig', 'sheep', 'tiger', 'dragon',
    'tree', 'flower', 'forest', 'mountain', 'river', 'sea', 'ocean', 'rain', 'snow',
    'sun', 'moon', 'star', 'fire', 'water', 'wind', 'cloud', 'sky', 'earth', 'stone',
    'red', 'blue', 'white', 'black', 'green', 'yellow', 'gold', 'silver',
    'house', 'car', 'train', 'boat', 'ship', 'plane', 'road', 'bridge', 'door', 'window',
    'book', 'paper', 'pen', 'hand', 'eye', 'mouth', 'ear', 'foot', 'head', 'heart',
    'food', 'rice', 'tea', 'coffee', 'apple', 'bread', 'meat', 'egg', 'milk', 'school',
    'chat', 'chien', 'oiseau', 'poisson', 'cheval', 'arbre', 'fleur', 'montagne',
    'riviere', 'mer', 'pluie', 'neige', 'soleil', 'lune', 'etoile', 'feu', 'eau',
    'rouge', 'bleu', 'blanc', 'noir', 'vert', 'jaune', 'maison', 'voiture', 'livre',
    'ecole', 'pont', 'main', 'oeil', 'bouche', 'oreille', 'pied', 'riz', 'the',
}

COMPLEX_KANJI_CHARS = set('達等的化性者員然無不非未之也哉')


def load_env_file(env_path: Optional[str] = None) -> Dict[str, str]:
    path = env_path or os.path.join(BASE_DIR, '.env')
    values: Dict[str, str] = {}
    if not os.path.exists(path):
        return values
    with open(path, 'r', encoding='utf-8') as f:
        for raw_line in f:
            line = raw_line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, val = line.split('=', 1)
            values[key.strip()] = val.strip().strip('"').strip("'")
    return values


def classify_item_complexity(item: Dict[str, Any]) -> str:
    """
    Zero-AI local router:
    - Concrete nouns/colors/animals/nature -> 'simple' (direct CDN, no AI evaluation)
    - Affixes (like 達), grammar, particles, slang, onomatopoeia, abstract terms -> 'complex'
    """
    kind = str(item.get('kind') or 'kanji').lower()
    if kind in ('grammar', 'particule', 'bunpou', 'slang', 'onomatopoeia'):
        return 'complex'

    term = str(item.get('term') or item.get('kanji') or item.get('word') or '').strip()
    if term and term in COMPLEX_KANJI_CHARS:
        return 'complex'

    cat = str(item.get('category') or '').lower()
    sub = str(item.get('subCategory') or '').lower()
    if cat in SIMPLE_CATEGORIES or sub in SIMPLE_CATEGORIES:
        return 'simple'

    meanings = item.get('meanings') or item.get('meanings_en') or item.get('meanings_fr') or []
    if isinstance(meanings, str):
        meanings = [meanings]
    blob = ' '.join(str(m).lower() for m in meanings)
    tokens = set(blob.replace(',', ' ').replace(';', ' ').split())
    if tokens & SIMPLE_KEYWORDS:
        return 'simple'

    return 'complex'


def search_cdn_candidates(query: str, unsplash_key: str = '', limit: int = 3) -> List[Dict[str, str]]:
    clean_q = query.strip()
    if not clean_q:
        return []

    candidates: List[Dict[str, str]] = []
    if unsplash_key:
        params = urllib.parse.urlencode({
            'query': clean_q,
            'per_page': str(limit),
            'orientation': 'squarish',
        })
        url = f'https://api.unsplash.com/search/photos?{params}'
        req = urllib.request.Request(
            url,
            headers={
                'Authorization': f'Client-ID {unsplash_key}',
                'Accept-Version': 'v1',
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = json.loads(resp.read().decode('utf-8'))
            for res in data.get('results', [])[:limit]:
                thumb = res.get('urls', {}).get('small') or res.get('urls', {}).get('thumb')
                if thumb:
                    candidates.append({
                        'url': thumb,
                        'description': str(res.get('alt_description') or res.get('description') or clean_q),
                        'source': 'unsplash',
                    })
        except Exception:
            pass

    if len(candidates) < limit:
        params = urllib.parse.urlencode({
            'action': 'query',
            'generator': 'search',
            'gsrsearch': f'{clean_q} filetype:bitmap',
            'gsrnamespace': '6',
            'gsrlimit': str(limit),
            'prop': 'imageinfo',
            'iiprop': 'url|extmetadata',
            'iiurlwidth': '256',
            'format': 'json',
        })
        url = f'https://commons.wikimedia.org/w/api.php?{params}'
        req = urllib.request.Request(url, headers={'User-Agent': 'eJLPT-SpriteBuilder/1.0'})
        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = json.loads(resp.read().decode('utf-8'))
            pages = data.get('query', {}).get('pages', {})
            for page in list(pages.values())[:limit]:
                info = (page.get('imageinfo') or [{}])[0]
                thumb = info.get('thumburl') or info.get('url')
                if thumb and not thumb.lower().endswith('.svg'):
                    candidates.append({
                        'url': thumb,
                        'description': str(page.get('title') or clean_q),
                        'source': 'wikimedia',
                    })
        except Exception:
            pass

    return candidates[:limit]


def evaluate_candidates_with_gemini(
    item: Dict[str, Any],
    candidates: List[Dict[str, str]],
    api_key: str,
    models: List[str],
) -> Dict[str, Any]:
    term = item.get('term') or item.get('kanji') or item.get('word') or ''
    meaning = item.get('query') or ''
    prompt = (
        f'Item japonais a illustrer pour un flashcard: "{term}" (sens: "{meaning}").\n'
        f'Candidats CDN trouves: {json.dumps(candidates, ensure_ascii=False)}\n'
        'Si un candidat represente clairement et pedagogiquement cet item, reponds JSON: '
        '{"selectedIndex": <0..n-1>, "reason": "..."}.\n'
        'Si aucun candidat ne convient (ex: concept abstrait, suffixe grammatical comme -tachi), '
        'reponds JSON: {"selectedIndex": -1, "generationPrompt": "<prompt anglais clair pour generer une illustration pedagogique minimaliste sans texte>"}.'
    )

    if not api_key:
        return {
            'selectedIndex': -1,
            'generationPrompt': f'Minimalist clean educational illustration representing Japanese concept "{meaning}" without text',
        }

    body = json.dumps({
        'contents': [{'role': 'user', 'parts': [{'text': prompt}]}],
        'generationConfig': {'temperature': 0.1, 'responseMimeType': 'application/json'},
    }).encode('utf-8')

    for model in models:
        url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent'
        for attempt in range(2):
            req = urllib.request.Request(
                url,
                data=body,
                method='POST',
                headers={'Content-Type': 'application/json', 'x-goog-api-key': api_key},
            )
            try:
                with urllib.request.urlopen(req, timeout=20) as resp:
                    raw = json.loads(resp.read().decode('utf-8'))
                text = ''.join(
                    p.get('text', '')
                    for p in raw.get('candidates', [{}])[0].get('content', {}).get('parts', [])
                ).strip()
                parsed = json.loads(text)
                if isinstance(parsed, dict):
                    return parsed
            except urllib.error.HTTPError as err:
                if err.code in (429, 500, 502, 503, 504) and attempt == 0:
                    time.sleep(0.8)
                    continue
                break
            except Exception:
                break

    return {
        'selectedIndex': -1,
        'generationPrompt': f'Minimalist educational icon representing "{meaning}" on clean background, no text',
    }


def load_queue(queue_path: str = QUEUE_FILE) -> List[Dict[str, Any]]:
    if os.path.exists(queue_path):
        with open(queue_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    return []


def save_queue(queue: List[Dict[str, Any]], queue_path: str = QUEUE_FILE) -> None:
    os.makedirs(os.path.dirname(queue_path), exist_ok=True)
    tmp = queue_path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(queue, f, ensure_ascii=False, indent=2)
    os.replace(tmp, queue_path)


def download_thumbnail(url: str, dest_path: str) -> bool:
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    req = urllib.request.Request(url, headers={'User-Agent': 'eJLPT-SpriteBuilder/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            content = resp.read()
        if len(content) < 256:
            return False
        with open(dest_path, 'wb') as f:
            f.write(content)
        return True
    except Exception:
        return False


def process_item_media(
    item: Dict[str, Any],
    cdn_search_fn: Callable[[str], List[Dict[str, str]]],
    ai_judge_fn: Callable[[Dict[str, Any], List[Dict[str, str]]], Dict[str, Any]],
    download_fn: Callable[[str, str], bool],
    queue: List[Dict[str, Any]],
    thumb_dir: str = THUMB_DIR,
) -> str:
    """
    Core triaging pipeline:
    - Simple item -> CDN direct, 0 AI calls. Queue only if 0 CDN results.
    - Complex item -> CDN + AI judge -> download if matched, else queue generationPrompt.
    """
    item_key = str(item.get('itemKey') or item.get('kanji') or item.get('term') or 'unknown')
    kind = str(item.get('kind') or 'kanji')
    query = str(item.get('query') or item_key)
    complexity = classify_item_complexity(item)

    candidates = cdn_search_fn(query)
    safe_key = base64.urlsafe_b64encode(item_key.encode('utf-8')).decode('ascii').rstrip('=')
    dest = os.path.join(thumb_dir, kind, f'{safe_key}.jpg')

    if complexity == 'simple':
        if candidates:
            if download_fn(candidates[0]['url'], dest):
                return 'cdn_simple'
        queue.append({
            'itemKey': item_key,
            'kind': kind,
            'term': item.get('term') or item.get('kanji') or item_key,
            'generationPrompt': f'Clean realistic educational visual for "{query}", no text',
            'status': 'pending',
            'attempts': 0,
        })
        return 'queued_fallback'

    # Complex item: AI evaluates CDN candidates
    verdict = ai_judge_fn(item, candidates)
    sel_idx = verdict.get('selectedIndex', -1)
    if isinstance(sel_idx, int) and 0 <= sel_idx < len(candidates):
        if download_fn(candidates[sel_idx]['url'], dest):
            return 'cdn_complex_verified'

    gen_prompt = str(
        verdict.get('generationPrompt')
        or f'Minimalist educational illustration for Japanese "{query}", no text'
    )
    existing_keys = {entry.get('itemKey') for entry in queue}
    if item_key not in existing_keys:
        queue.append({
            'itemKey': item_key,
            'kind': kind,
            'term': item.get('term') or item.get('kanji') or item_key,
            'generationPrompt': gen_prompt,
            'status': 'pending',
            'attempts': 0,
        })
    return 'queued_ai_prompt'


def generate_image_with_gemini(prompt: str, api_key: str, dest_path: str) -> bool:
    if not api_key:
        return False
    url = 'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict'
    payload = json.dumps({
        'instances': [{'prompt': prompt}],
        'parameters': {'sampleCount': 1, 'aspectRatio': '1:1'},
    }).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=payload,
        method='POST',
        headers={'Content-Type': 'application/json', 'x-goog-api-key': api_key},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode('utf-8'))
        b64 = data.get('predictions', [{}])[0].get('bytesBase64Encoded')
        if not b64:
            return False
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        with open(dest_path, 'wb') as f:
            f.write(base64.b64decode(b64))
        return True
    except Exception:
        return False


def run_generation_batch(limit: int = 20, queue_path: str = QUEUE_FILE, thumb_dir: str = THUMB_DIR) -> Dict[str, int]:
    env = load_env_file()
    api_key = os.environ.get('GEMINI_API_KEY') or env.get('GEMINI_API_KEY', '')
    queue = load_queue(queue_path)
    done = 0
    failed = 0

    for entry in queue:
        if done + failed >= limit:
            break
        if entry.get('status') != 'pending':
            continue
        item_key = str(entry['itemKey'])
        kind = str(entry.get('kind') or 'kanji')
        safe_key = base64.urlsafe_b64encode(item_key.encode('utf-8')).decode('ascii').rstrip('=')
        dest = os.path.join(thumb_dir, kind, f'{safe_key}.png')
        ok = generate_image_with_gemini(str(entry['generationPrompt']), api_key, dest)
        entry['attempts'] = int(entry.get('attempts', 0)) + 1
        if ok:
            entry['status'] = 'done'
            entry['file'] = dest
            done += 1
        else:
            if entry['attempts'] >= 3:
                entry['status'] = 'error'
            failed += 1
            save_queue(queue, queue_path)
            # Stop batch gracefully on quota/network errors without failing
            break

    save_queue(queue, queue_path)
    return {'done': done, 'failed': failed, 'remaining': sum(1 for e in queue if e.get('status') == 'pending')}


def load_kanji_items(limit: int, level_filter: str = 'ALL') -> List[Dict[str, Any]]:
    path = os.path.join(DATA_DIR, 'kanjiDatabase_unified.json')
    with open(path, 'r', encoding='utf-8') as f:
        doc = json.load(f)
    keys = list(doc['schema'].keys()) if isinstance(doc['schema'], dict) else list(doc['schema'])
    items: List[Dict[str, Any]] = []
    for raw in doc['data']:
        row = {keys[i]: raw[i] if i < len(raw) else None for i in range(len(keys))}
        if level_filter != 'ALL' and row.get('jlpt') != level_filter:
            continue
        meanings_en = [m for m in (row.get('meanings_en') or []) if m and m != '-']
        meanings_fr = [m for m in (row.get('meanings_fr') or []) if m and m != '-']
        query = meanings_en[0] if meanings_en else (meanings_fr[0] if meanings_fr else row['kanji'])
        items.append({
            'itemKey': f'kanji:{row["kanji"]}',
            'kind': 'kanji',
            'kanji': row['kanji'],
            'term': row['kanji'],
            'category': row.get('category') or '',
            'subCategory': row.get('subCategory') or '',
            'meanings_en': meanings_en,
            'meanings_fr': meanings_fr,
            'query': str(query),
        })
        if len(items) >= limit:
            break
    return items


def main() -> None:
    parser = argparse.ArgumentParser(description='Pipeline hybride images CDN -> Juge IA -> File de lots')
    parser.add_argument('--triage-limit', type=int, default=20)
    parser.add_argument('--level', default='N5')
    parser.add_argument('--run-gen-batch', action='store_true')
    parser.add_argument('--limit', type=int, default=20)
    args = parser.parse_args()

    if args.run_gen_batch:
        stats = run_generation_batch(limit=args.limit)
        print('[GenBatch]', stats)
        return

    env = load_env_file()
    unsplash_key = os.environ.get('UNSPLASH_ACCESS_KEY') or env.get('UNSPLASH_ACCESS_KEY', '')
    gemini_key = os.environ.get('GEMINI_API_KEY') or env.get('GEMINI_API_KEY', '')
    models = [
        m.strip()
        for m in (os.environ.get('GEMINI_MODEL') or env.get('GEMINI_MODEL', 'gemini-3.5-flash-lite')).split(',')
        if m.strip()
    ]

    queue = load_queue()
    items = load_kanji_items(args.triage_limit, args.level)
    counts: Dict[str, int] = {}
    for item in items:
        outcome = process_item_media(
            item,
            cdn_search_fn=lambda q: search_cdn_candidates(q, unsplash_key=unsplash_key),
            ai_judge_fn=lambda it, cands: evaluate_candidates_with_gemini(it, cands, gemini_key, models),
            download_fn=download_thumbnail,
            queue=queue,
        )
        counts[outcome] = counts.get(outcome, 0) + 1
    save_queue(queue)
    print('[Triage]', counts, f'queue_size={len(queue)}')


if __name__ == '__main__':
    main()
