from __future__ import annotations

import argparse
import json
import os
import time
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional, Tuple

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'public', 'data')
DEFAULT_CHECKPOINT = os.path.join(BASE_DIR, '_docs', 'batch_state', 'semantic_checkpoint.json')
DEFAULT_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.1-pro-preview']


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


def parse_model_chain(raw: str) -> List[str]:
    models: List[str] = []
    for part in raw.replace(';', ',').split(','):
        m = part.strip()
        if m and m not in models:
            models.append(m)
    return models or list(DEFAULT_MODELS)


def load_checkpoint(path: str) -> Dict[str, Any]:
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {'completedKeys': {}, 'lastUpdated': None}


def save_checkpoint(path: str, data: Dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    data['lastUpdated'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def call_gemini_json(
    prompt: str,
    api_key: str,
    models: List[str],
    max_retries: int = 2,
    timeout: int = 25,
) -> Tuple[Optional[Any], str]:
    if not api_key:
        return None, 'missing_api_key'

    payload = json.dumps({
        'contents': [{'role': 'user', 'parts': [{'text': prompt}]}],
        'generationConfig': {
            'temperature': 0.2,
            'maxOutputTokens': 2400,
            'responseMimeType': 'application/json',
        },
    }).encode('utf-8')

    for model in models:
        url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent'
        for attempt in range(max_retries + 1):
            req = urllib.request.Request(
                url,
                data=payload,
                method='POST',
                headers={
                    'Content-Type': 'application/json',
                    'x-goog-api-key': api_key,
                },
            )
            try:
                with urllib.request.urlopen(req, timeout=timeout) as resp:
                    raw = json.loads(resp.read().decode('utf-8'))
                parts = raw.get('candidates', [{}])[0].get('content', {}).get('parts', [])
                text = ''.join(p.get('text', '') for p in parts).strip()
                if text.startswith('```'):
                    text = text.strip('`')
                    if text.startswith('json'):
                        text = text[4:].strip()
                return json.loads(text), model
            except urllib.error.HTTPError as err:
                if err.code in (401, 403):
                    return None, 'auth_error'
                if err.code in (429, 500, 502, 503, 504) and attempt < max_retries:
                    time.sleep(0.8 * (2 ** attempt))
                    continue
                break
            except Exception:
                if attempt < max_retries:
                    time.sleep(0.8 * (2 ** attempt))
                    continue
                break
    return None, 'exhausted'


def build_semantic_prompt(target: str, items: List[Dict[str, Any]]) -> str:
    if target == 'kanji':
        summary = [
            {
                'kanji': it.get('kanji'),
                'meanings': (it.get('meanings_fr') or it.get('meanings_en') or [])[:3],
                'antonyms': it.get('antonyms') or [],
                'synonyms': it.get('synonyms') or [],
            }
            for it in items
        ]
        return (
            'Pour chaque kanji japonais ci-dessous, retourne un JSON array d objets '
            'avec les cles: kanji, antonyms (max 4 kanjis), synonyms (max 4 kanjis), '
            'dualisme (-1 negatif, 0 neutre, 1 positif), sotoUchi ("soto"|"uchi"|"neutral"), '
            'senseProbabilities ([{meaning, percent}] total 100).\n'
            + json.dumps(summary, ensure_ascii=False)
        )
    if target == 'slang':
        summary = [{'term': it.get('term'), 'meaning': (it.get('meaning') or [])[:2]} for it in items]
        return (
            'Pour chaque expression argotique japonaise ci-dessous, retourne un JSON array d objets: '
            'term, era (ex: "Annees 2020 (SNS)", "Annees 2010", "Heisei", "Showa", "Contemporain"), '
            'annualFrequency (entier 1..100 representant la frequence estimee cette annee).\n'
            + json.dumps(summary, ensure_ascii=False)
        )
    if target == 'ono':
        summary = [{'term': it.get('term'), 'defs': (it.get('shortDefinitions') or [])[:2]} for it in items]
        return (
            'Pour chaque onomatopee japonaise ci-dessous, retourne un JSON array d objets: '
            'term, oppositeTerms (liste d onomatopees opposees connues, ex ["ぼろぼろ"]), pairTheme (court).\n'
            + json.dumps(summary, ensure_ascii=False)
        )
    summary = [{'word': it.get('word'), 'meaning_en': it.get('meaning_en')} for it in items]
    return (
        'Pour chaque mot japonais ci-dessous, retourne un JSON array d objets: '
        'word, senseProbabilities ([{meaning, percent}] total 100).\n'
        + json.dumps(summary, ensure_ascii=False)
    )


def merge_semantic_patch(target: str, row: Dict[str, Any], patch: Dict[str, Any]) -> Dict[str, Any]:
    updated = dict(row)
    if target == 'kanji':
        for field in ('antonyms', 'synonyms'):
            vals = patch.get(field)
            if isinstance(vals, list) and vals:
                merged = list(updated.get(field) or [])
                for v in vals:
                    if isinstance(v, str) and len(v) == 1 and v not in merged:
                        merged.append(v)
                updated[field] = merged[:8]
        if patch.get('dualisme') in (-1, 0, 1):
            updated['dualisme'] = patch['dualisme']
        if patch.get('sotoUchi') in ('soto', 'uchi', 'neutral'):
            updated['sotoUchi'] = patch['sotoUchi']
        if isinstance(patch.get('senseProbabilities'), list) and patch['senseProbabilities']:
            updated['senseProbabilities'] = patch['senseProbabilities']
    elif target == 'slang':
        if isinstance(patch.get('era'), str) and patch['era'].strip():
            updated['era'] = patch['era'].strip()
        freq = patch.get('annualFrequency')
        if isinstance(freq, (int, float)):
            updated['annualFrequency'] = max(1, min(100, int(freq)))
    elif target == 'ono':
        if isinstance(patch.get('oppositeTerms'), list):
            merged_opp = list(updated.get('oppositeTerms') or [])
            for t in patch['oppositeTerms']:
                if isinstance(t, str) and t and t not in merged_opp:
                    merged_opp.append(t)
            updated['oppositeTerms'] = merged_opp
        if isinstance(patch.get('pairTheme'), str) and patch['pairTheme'].strip():
            updated['pairTheme'] = patch['pairTheme'].strip()
    elif target == 'polysemy':
        if isinstance(patch.get('senseProbabilities'), list) and patch['senseProbabilities']:
            updated['senseProbabilities'] = patch['senseProbabilities']
    return updated


def run_batch(
    target: str,
    batch_size: int,
    max_batches: int,
    checkpoint_path: str,
    resume: bool,
    dry_run: bool,
) -> Dict[str, int]:
    file_map = {
        'kanji': ('kanjiDatabase_unified.json', 'kanji'),
        'slang': ('slang_unified.json', 'term'),
        'ono': ('onomatopoeia_unified.json', 'term'),
        'polysemy': ('jukugo_unified.json', 'word'),
    }
    filename, key_field = file_map[target]
    json_path = os.path.join(DATA_DIR, filename)

    with open(json_path, 'r', encoding='utf-8') as f:
        doc = json.load(f)
    schema = doc['schema']
    keys = list(schema.keys()) if isinstance(schema, dict) else list(schema)
    rows = [{keys[i]: r[i] if i < len(r) else None for i in range(len(keys))} for r in doc['data']]

    checkpoint = load_checkpoint(checkpoint_path) if resume else {'completedKeys': {}, 'lastUpdated': None}
    done_set = set(checkpoint.get('completedKeys', {}).get(target, []))

    candidates = [r for r in rows if str(r.get(key_field) or '') not in done_set]
    if target == 'kanji':
        candidates = [r for r in candidates if not r.get('antonyms') or not r.get('synonyms')]

    env = load_env_file()
    api_key = os.environ.get('GEMINI_API_KEY') or env.get('GEMINI_API_KEY', '')
    models = parse_model_chain(os.environ.get('GEMINI_MODEL') or env.get('GEMINI_MODEL', ''))

    processed = 0
    updated_count = 0
    row_by_key = {str(r.get(key_field)): idx for idx, r in enumerate(rows)}

    for b_idx in range(max_batches):
        chunk = candidates[b_idx * batch_size : (b_idx + 1) * batch_size]
        if not chunk:
            break
        if dry_run:
            processed += len(chunk)
            continue

        prompt = build_semantic_prompt(target, chunk)
        parsed, status = call_gemini_json(prompt, api_key, models)
        if parsed is None:
            print(f'[Batch {target}] Stopped gracefully at batch {b_idx + 1}: {status}')
            break

        if isinstance(parsed, list):
            for patch in parsed:
                if not isinstance(patch, dict):
                    continue
                k_val = str(patch.get(key_field) or '')
                if k_val in row_by_key:
                    idx = row_by_key[k_val]
                    rows[idx] = merge_semantic_patch(target, rows[idx], patch)
                    updated_count += 1

        for it in chunk:
            k_val = str(it.get(key_field) or '')
            if k_val:
                done_set.add(k_val)
        checkpoint.setdefault('completedKeys', {})[target] = sorted(done_set)
        save_checkpoint(checkpoint_path, checkpoint)
        processed += len(chunk)

    if not dry_run and updated_count > 0:
        doc['data'] = [[row.get(k) for k in keys] for row in rows]
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(doc, f, ensure_ascii=False, separators=(',', ':'))

    return {'processed': processed, 'updated': updated_count}


def main() -> None:
    parser = argparse.ArgumentParser(description='Enrichissement sémantique par lots Gemini résumables')
    parser.add_argument('--target', choices=['kanji', 'slang', 'ono', 'polysemy', 'all'], default='kanji')
    parser.add_argument('--batch-size', type=int, default=15)
    parser.add_argument('--max-batches', type=int, default=3)
    parser.add_argument('--checkpoint', default=DEFAULT_CHECKPOINT)
    parser.add_argument('--resume', action='store_true')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    targets = ['kanji', 'slang', 'ono', 'polysemy'] if args.target == 'all' else [args.target]
    for tgt in targets:
        res = run_batch(tgt, args.batch_size, args.max_batches, args.checkpoint, args.resume, args.dry_run)
        print(f'[{tgt}] processed={res["processed"]}, updated={res["updated"]}')


if __name__ == '__main__':
    main()
