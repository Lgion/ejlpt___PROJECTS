from __future__ import annotations

import json
import os
import re
from collections import defaultdict
from typing import Any, Dict, List, Optional, Set, Tuple

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'public', 'data')
TMP_DIR = os.path.join(BASE_DIR, 'public', 'tmp')

KANJI_RE = re.compile(r'[\u4e00-\u9faf\u3400-\u4dbf]')
HIRA_RE = re.compile(r'[\u3040-\u309fー]')
KATA_RE = re.compile(r'[\u30a0-\u30ff]')
LATIN_RE = re.compile(r'[A-Za-z0-9]')

# 180+ core Japanese kanji antonym pairs (bidirectional)
ANTONYM_PAIRS: List[Tuple[str, str]] = [
    ('大', '小'), ('上', '下'), ('多', '少'), ('長', '短'), ('高', '低'),
    ('善', '悪'), ('勝', '負'), ('始', '終'), ('開', '閉'), ('増', '減'),
    ('入', '出'), ('買', '売'), ('生', '死'), ('明', '暗'), ('強', '弱'),
    ('軽', '重'), ('広', '狭'), ('新', '古'), ('早', '遅'), ('正', '誤'),
    ('優', '劣'), ('貧', '富'), ('敵', '味'), ('攻', '守'), ('喜', '悲'),
    ('幸', '災'), ('陽', '陰'), ('動', '静'), ('硬', '軟'), ('乾', '湿'),
    ('満', '空'), ('遠', '近'), ('内', '外'), ('表', '裏'), ('左', '右'),
    ('東', '西'), ('南', '北'), ('男', '女'), ('昼', '夜'), ('朝', '夕'),
    ('春', '秋'), ('夏', '冬'), ('暑', '寒'), ('暖', '冷'), ('深', '浅'),
    ('厚', '薄'), ('濃', '淡'), ('速', '遅'), ('難', '易'), ('危', '安'),
    ('損', '益'), ('貸', '借'), ('送', '受'), ('問', '答'), ('賛', '反'),
    ('公', '私'), ('真', '偽'), ('実', '虚'), ('有', '無'), ('存', '亡'),
    ('栄', '衰'), ('進', '退'), ('昇', '降'), ('往', '復'), ('発', '着'),
    ('乗', '降'), ('押', '引'), ('吸', '吐'), ('伸', '縮'), ('締', '緩'),
    ('結', '解'), ('集', '散'), ('合', '分'), ('同', '異'), ('単', '複'),
    ('全', '半'), ('親', '疎'), ('敬', '蔑'), ('褒', '貶'), ('許', '禁'),
    ('罰', '賞'), ('勝', '敗'), ('健', '病'), ('潔', '汚'), ('美', '醜'),
    ('賢', '愚'), ('聖', '俗'), ('天', '地'), ('山', '川'), ('海', '陸'),
    ('水', '火'), ('白', '黒'), ('赤', '青'), ('老', '若'), ('幼', '老'),
    ('父', '母'), ('兄', '弟'), ('姉', '妹'), ('夫', '妻'), ('師', '弟'),
    ('主', '従'), ('先', '後'), ('前', '後'), ('初', '末'), ('本', '末'),
    ('源', '流'), ('因', '果'), ('罪', '罰'), ('福', '禍'), ('吉', '凶'),
    ('笑', '泣'), ('愛', '憎'), ('好', '嫌'), ('望', '絶'), ('信', '疑'),
    ('知', '無'), ('学', '教'), ('読', '書'), ('聞', '話'), ('見', '隠'),
    ('現', '隠'), ('起', '寝'), ('立', '座'), ('行', '来'), ('帰', '去'),
    ('着', '脱'), ('与', '奪'), ('得', '失'), ('益', '害'), ('利', '害'),
    ('正', '邪'), ('和', '戦'), ('平', '乱'), ('治', '乱'), ('静', '騒'),
    ('清', '濁'), ('純', '雑'), ('精', '粗'), ('密', '疎'), ('直', '曲'),
    ('縦', '横'), ('丸', '角'), ('尖', '鈍'), ('鋭', '鈍'), ('甘', '辛'),
    ('苦', '楽'), ('痛', '快'), ('飢', '飽'), ('渇', '潤'), ('晴', '曇'),
    ('朝', '晩'), ('今', '昔'), ('昨', '明'), ('過', '未'), ('永', '瞬'),
    ('常', '変'), ('定', '動'), ('固', '液'), ('貴', '賤'), ('尊', '卑'),
    ('富', '窮'), ('豊', '乏'), ('余', '欠'), ('足', '欠'), ('完', '欠'),
    ('加', '減'), ('倍', '半'), ('奇', '偶'), ('個', '群'), ('総', '別'),
]

SONKEIGO_KANJIS = set('尊敬御貴拝覧召仰殿様令芳玉賜降臨御')
KENJOUGO_KANJIS = set('謙謹拝伺参致申頂戴存承奉恐弊拙愚')
SOTO_KANJIS = set('尊敬御貴殿様令芳玉賜客外他公社先生師')
UCHI_KANJIS = set('謙謹愚拙弊私自家族親身内父母兄姉弟妹')
PRONOUN_KANJIS: Dict[str, str] = {
    '私': 'personnel', '僕': 'personnel', '俺': 'personnel', '彼': 'personnel',
    '彼女': 'personnel', '君': 'personnel', '貴': 'personnel', '我': 'personnel',
    '己': 'personnel', '自': 'personnel', '誰': 'interrogatif', '何': 'interrogatif',
    '孰': 'interrogatif', '此': 'demonstratif', '其': 'demonstratif', '彼': 'demonstratif',
    '斯': 'demonstratif', '某': 'indefini', '各': 'indefini', '皆': 'indefini',
}
SETSUZOKUSHI_KANJIS = set('然且但即故因依従並又及若或但')
KANDOUSHI_KANJIS = set('嗚呼嗟噫喝驚感哀')

POSITIVE_HINTS = (
    'good', 'happy', 'joy', 'love', 'peace', 'bright', 'win', 'success', 'luck', 'beauty',
    'clean', 'pure', 'kind', 'wise', 'respect', 'honor', 'hope', 'profit', 'rich', 'health',
    'bon', 'bien', 'joie', 'heureux', 'amour', 'paix', 'lumière', 'succès', 'chance', 'beau',
    'propre', 'pur', 'gentil', 'sage', 'respect', 'honneur', 'espoir', 'richesse', 'santé',
    '優', '良', '善', '幸', '喜', '楽', '美', '福', '愛', '和', '祝', '栄', '勝', '健',
)
NEGATIVE_HINTS = (
    'bad', 'evil', 'sad', 'hate', 'war', 'dark', 'lose', 'fail', 'death', 'kill', 'sick',
    'dirty', 'poor', 'crime', 'sin', 'fear', 'pain', 'anger', 'poison', 'destroy', 'enemy',
    'mauvais', 'mal', 'triste', 'haine', 'guerre', 'sombre', 'perdre', 'échec', 'mort', 'tuer',
    'malade', 'sale', 'pauvre', 'crime', 'péché', 'peur', 'douleur', 'colère', 'poison', 'ennemi',
    '悪', '悲', '死', '病', '苦', '痛', '貧', '災', '罪', '毒', '殺', '敗', '怒', '怖', '嫌',
)

ONO_OPPOSITE_PAIRS: List[Tuple[str, str, str]] = [
    ('ぴかぴか', 'ぼろぼろ', 'État / Propreté'),
    ('ピカピカ', 'ボロボロ', 'État / Propreté'),
    ('つるつる', 'ざらざら', 'Texture'),
    ('ツルツル', 'ザラザラ', 'Texture'),
    ('さらさら', 'べたべた', 'Texture / Humidité'),
    ('サラサラ', 'ベタベタ', 'Texture / Humidité'),
    ('ふわふわ', 'かちかち', 'Consistance'),
    ('フワフワ', 'カチカチ', 'Consistance'),
    ('すっきり', 'もやもや', 'Clarté mentale'),
    ('スッキリ', 'モヤモヤ', 'Clarté mentale'),
    ('にこにこ', 'ぷんぷん', 'Humeur / Expression'),
    ('ニコニコ', 'プンプン', 'Humeur / Expression'),
    ('わくわく', 'びくびく', 'Émotion'),
    ('ワクワク', 'ビクビク', 'Émotion'),
    ('ぐっすり', 'うとうと', 'Sommeil'),
    ('どんどん', 'のろのろ', 'Vitesse / Rythme'),
    ('ドンドン', 'ノロノロ', 'Vitesse / Rythme'),
    ('はっきり', 'ぼんやり', 'Netteté / Clarté'),
    ('ぎっしり', 'すかすか', 'Densité'),
    ('ギッシリ', 'スカスカ', 'Densité'),
    ('からから', 'びしょびしょ', 'Sécheresse / Eau'),
    ('カラカラ', 'ビショビショ', 'Sécheresse / Eau'),
    ('ほかほか', 'ひんやり', 'Température'),
    ('ホカホカ', 'ヒンヤリ', 'Température'),
    ('きらきら', 'どんより', 'Lumière / Ciel'),
    ('キラキラ', 'ドンヨリ', 'Lumière / Ciel'),
    ('すべすべ', 'がさがさ', 'Peau / Surface'),
    ('スベスベ', 'ガサガサ', 'Peau / Surface'),
    ('ぴんぴん', 'へろへろ', 'Énergie / Forme'),
    ('ピンピン', 'ヘロヘロ', 'Énergie / Forme'),
    ('てきぱき', 'だらだら', 'Efficacité'),
    ('テキパキ', 'ダラダラ', 'Efficacité'),
    ('がっちり', 'ひょろひょろ', 'Morphologie'),
    ('こってり', 'あっさり', 'Goût / Richesse'),
    ('しっとり', 'ぱさぱさ', 'Humidité / Texture'),
    ('しとしと', 'ざあざあ', 'Pluie'),
    ('シトシト', 'ザアザア', 'Pluie'),
    ('そよそよ', 'びゅうびゅう', 'Vent'),
    ('すやすや', 'わんわん', 'Calme / Bruit'),
    ('ぺらぺら', 'たどたど', 'Maîtrise orale'),
    ('ぴんと', 'ぐにゃっと', 'Tension'),
    ('きっちり', 'いいかげん', 'Rigueur'),
    ('ぎゅうぎゅう', 'ゆったり', 'Espace'),
    ('ずっしり', 'かるがる', 'Poids'),
]


def load_columnar_json(path: str) -> Tuple[Dict[str, Any], List[str], List[Dict[str, Any]]]:
    with open(path, 'r', encoding='utf-8') as f:
        doc = json.load(f)
    schema = doc.get('schema', {})
    keys = list(schema.keys()) if isinstance(schema, dict) else list(schema)
    rows: List[Dict[str, Any]] = []
    for raw in doc.get('data', []):
        row: Dict[str, Any] = {}
        for idx, k in enumerate(keys):
            row[k] = raw[idx] if idx < len(raw) else None
        rows.append(row)
    return doc, keys, rows


def save_columnar_json(
    path: str,
    doc: Dict[str, Any],
    schema_dict: Dict[str, str],
    rows: List[Dict[str, Any]],
) -> None:
    keys = list(schema_dict.keys())
    doc['schema'] = schema_dict
    doc['data'] = [[row.get(k) for k in keys] for row in rows]
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, separators=(',', ':'))


def normalize_reading(r: str) -> str:
    clean = r.split('.')[0].split('-')[0].strip()
    # Convert katakana to hiragana for cross-reading homonym grouping
    out = []
    for ch in clean:
        code = ord(ch)
        if 0x30A1 <= code <= 0x30F6:
            out.append(chr(code - 0x60))
        else:
            out.append(ch)
    return ''.join(out)


def compute_kanji_freq_score_10(freq: Any) -> int:
    if not isinstance(freq, dict):
        return 1
    ranks: List[int] = []
    for key in ('news', 'wikipedia', 'twitter', 'aozora', 'innocent_rank'):
        val = freq.get(key)
        if isinstance(val, (int, float)) and val > 0:
            ranks.append(int(val))
    if not ranks:
        return 1
    best = min(ranks)
    if best <= 120:
        return 10
    if best <= 300:
        return 9
    if best <= 600:
        return 8
    if best <= 1000:
        return 7
    if best <= 1500:
        return 6
    if best <= 2200:
        return 5
    if best <= 3200:
        return 4
    if best <= 5000:
        return 3
    if best <= 9000:
        return 2
    return 1


def compute_jukugo_freq_score_10(freq: Any) -> int:
    val = int(freq) if isinstance(freq, (int, float)) else 0
    if val >= 250000:
        return 10
    if val >= 100000:
        return 9
    if val >= 40000:
        return 8
    if val >= 15000:
        return 7
    if val >= 6000:
        return 6
    if val >= 2500:
        return 5
    if val >= 1000:
        return 4
    if val >= 350:
        return 3
    if val >= 100:
        return 2
    return 1


def classify_script(word: str) -> str:
    if not word:
        return 'hira_only'
    has_kanji = bool(KANJI_RE.search(word))
    has_hira = bool(HIRA_RE.search(word))
    has_kata = bool(KATA_RE.search(word))
    has_latin = bool(LATIN_RE.search(word))
    if has_latin:
        return 'mixed_romaji'
    if has_kanji:
        return 'mixed_kanji'
    if has_hira and has_kata:
        return 'mixed_hira_kata'
    if has_kata:
        return 'kata_only'
    return 'hira_only'


def build_sense_probabilities(meanings: List[str]) -> List[Dict[str, Any]]:
    clean = [m.strip() for m in meanings if isinstance(m, str) and m.strip() and m.strip() != '-']
    if len(clean) <= 1:
        return [{'meaning': clean[0], 'percent': 100}] if clean else []
    selected = clean[:5]
    # Decreasing zipf-like baseline weights normalized to sum strictly to 100
    raw_weights = [max(1, len(selected) * 2 - i * 2) for i in range(len(selected))]
    total = sum(raw_weights)
    probs = [int(round(w * 100.0 / total)) for w in raw_weights]
    diff = 100 - sum(probs)
    probs[0] += diff
    return [{'meaning': m, 'percent': p} for m, p in zip(selected, probs)]


def infer_dualisme(kanji: str, meanings_fr: List[str], meanings_en: List[str]) -> int:
    if kanji in POSITIVE_HINTS:
        return 1
    if kanji in NEGATIVE_HINTS:
        return -1
    blob = ' '.join([str(m).lower() for m in (meanings_fr + meanings_en)])
    pos_hits = sum(1 for h in POSITIVE_HINTS if isinstance(h, str) and h.isascii() and re.search(r'\b' + re.escape(h) + r'\b', blob))
    neg_hits = sum(1 for h in NEGATIVE_HINTS if isinstance(h, str) and h.isascii() and re.search(r'\b' + re.escape(h) + r'\b', blob))
    if pos_hits > neg_hits:
        return 1
    if neg_hits > pos_hits:
        return -1
    return 0


def infer_skip_compositions(skip_code: str, comp_in: List[str]) -> List[str]:
    parts: List[str] = []
    if isinstance(skip_code, str) and '-' in skip_code:
        prefix = skip_code.split('-')[0]
        if prefix == '1':
            parts.append('hen+tsukuri (gauche-droite)')
        elif prefix == '2':
            parts.append('kanmuri+ashi (haut-bas)')
        elif prefix == '3':
            parts.append('kamae/nyou/tare (enveloppe)')
        elif prefix == '4':
            parts.append('solid (bloc unitaire)')
    for c in comp_in[:6]:
        if isinstance(c, str) and c:
            parts.append(f'comp:{c}')
    return parts


def infer_kanji_themes(row: Dict[str, Any]) -> List[str]:
    themes: Set[str] = set()
    jlpt = str(row.get('jlpt') or '')
    cat = str(row.get('category') or '').lower()
    sub = str(row.get('subCategory') or '').lower()
    ktype = str(row.get('type') or '').lower()

    if jlpt == 'N0' or 'quotidien' in cat or 'maison' in cat or 'corps' in cat or 'famille' in cat:
        themes.add('quotidien')
    if 'num' in cat or 'nombre' in cat or 'chiffre' in sub or row.get('kanji') in '一二三四五六七八九十百千万億兆':
        themes.add('numeral')
    if row.get('isVerbe') not in (None, False, 'false', ''):
        themes.add('verbe')
    if row.get('isAdj') not in (None, False, 'false', ''):
        themes.add('adjectif')
    if row.get('isSetsuzokushi'):
        themes.add('conjonction')
        themes.add('setsuzokushi')
        themes.add('grammaire')
    if row.get('isKandoushi'):
        themes.add('expressions')
    if row.get('isPronoun') not in (None, False, 'false', ''):
        themes.add('pronom')
        themes.add('grammaire')
    if any(row.get('isKeigo') or [False, False]):
        themes.add('keigo')
        themes.add('grammaire')
    if 'nom' in ktype or 'noun' in ktype or row.get('isProperName'):
        themes.add('nom')
    if 'adverb' in ktype or 'adv' in ktype:
        themes.add('adverbe')
    if 'prep' in ktype or row.get('kanji') in '上下内外前後左右間中対於以自至':
        themes.add('preposition')
        themes.add('grammaire')
    if 'conj' in ktype or row.get('kanji') in '及並又或若但因故且然':
        themes.add('conjonction')
        themes.add('grammaire')
    if row.get('kanji') in '達等共的化性者員家然的無不非未':
        themes.add('grammaire')
    if row.get('kanji') in '珈琲麦酒煙草硝子亜米利加仏蘭西英吉利独逸露西亜':
        themes.add('ateji')
        themes.add('gairaigo')
    if not themes:
        themes.add('quotidien' if jlpt in ('N5', 'N4', 'N0') else 'expressions')
    return sorted(themes)


def enrich_kanjis() -> Dict[str, str]:
    path = os.path.join(DATA_DIR, 'kanjiDatabase_unified.json')
    doc, old_keys, rows = load_columnar_json(path)
    old_schema = dict(doc['schema']) if isinstance(doc['schema'], dict) else {k: 'string' for k in old_keys}

    comp_path = os.path.join(DATA_DIR, 'composition.json')
    comp_map: Dict[str, Any] = {}
    if os.path.exists(comp_path):
        with open(comp_path, 'r', encoding='utf-8') as f:
            comp_map = json.load(f)

    syn_path = os.path.join(TMP_DIR, 'data', 'kanji-synonyms.json')
    syn_groups_by_char: Dict[str, Set[str]] = defaultdict(set)
    if os.path.exists(syn_path):
        with open(syn_path, 'r', encoding='utf-8') as f:
            syn_doc = json.load(f)
        for grp in syn_doc.get('synonymGroups', []):
            chars = [k.get('kanji') for k in grp.get('kanji', []) if k.get('kanji')]
            for c in chars:
                for other in chars:
                    if other != c:
                        syn_groups_by_char[c].add(other)

    # Index readings & primary meanings for homonyms / synonyms / component similarity
    by_reading: Dict[str, List[str]] = defaultdict(list)
    by_meaning: Dict[str, List[str]] = defaultdict(list)
    by_component: Dict[str, List[str]] = defaultdict(list)
    kanji_lookup: Dict[str, Dict[str, Any]] = {}

    for row in rows:
        k = str(row.get('kanji') or '')
        if not k:
            continue
        kanji_lookup[k] = row
        readings = (row.get('on_readings') or []) + (row.get('kun_readings') or [])
        seen_r: Set[str] = set()
        for r in readings:
            norm = normalize_reading(str(r))
            if norm and norm not in seen_r:
                seen_r.add(norm)
                by_reading[norm].append(k)

        for m in (row.get('meanings_en') or [])[:2]:
            clean_m = str(m).strip().lower()
            if len(clean_m) >= 3 and clean_m != '-':
                by_meaning[clean_m].append(k)

        for c in (comp_map.get(k, {}).get('in') or []):
            if c:
                by_component[c].append(k)

    antonym_map: Dict[str, Set[str]] = defaultdict(set)
    for a, b in ANTONYM_PAIRS:
        if a in kanji_lookup and b in kanji_lookup:
            antonym_map[a].add(b)
            antonym_map[b].add(a)

    kanji_jlpt_map: Dict[str, str] = {}

    for row in rows:
        k = str(row.get('kanji') or '')
        if not k:
            continue
        kanji_jlpt_map[k] = str(row.get('jlpt') or 'N0')

        # 1. SKIP compositions
        comp_in = comp_map.get(k, {}).get('in') or []
        if not row.get('compositionsSKIP'):
            row['compositionsSKIP'] = infer_skip_compositions(str(row.get('skipCode') or ''), comp_in)

        # 2. Homonyms (same normalized reading)
        homonym_set: List[str] = []
        seen_h: Set[str] = {k}
        for r in (row.get('on_readings') or []) + (row.get('kun_readings') or []):
            norm = normalize_reading(str(r))
            for cand in by_reading.get(norm, []):
                if cand not in seen_h:
                    seen_h.add(cand)
                    homonym_set.append(cand)
                    if len(homonym_set) >= 12:
                        break
            if len(homonym_set) >= 12:
                break
        row['homonyms'] = homonym_set

        # 3. Synonyms
        existing_syn = list(row.get('synonyms') or [])
        syn_seen: Set[str] = {k, *existing_syn}
        for cand in sorted(syn_groups_by_char.get(k, set())):
            if cand in kanji_lookup and cand not in syn_seen:
                syn_seen.add(cand)
                existing_syn.append(cand)
        for m in (row.get('meanings_en') or [])[:1]:
            clean_m = str(m).strip().lower()
            for cand in by_meaning.get(clean_m, []):
                if cand not in syn_seen:
                    syn_seen.add(cand)
                    existing_syn.append(cand)
                if len(existing_syn) >= 8:
                    break
        row['synonyms'] = existing_syn[:8]

        # 4. Antonyms
        existing_ant = list(row.get('antonyms') or [])
        for ant in sorted(antonym_map.get(k, set())):
            if ant not in existing_ant:
                existing_ant.append(ant)
        row['antonyms'] = existing_ant[:6]

        # 5. Similar visuals via shared components & similar strokes
        existing_sim = list(row.get('similar') or [])
        if len(existing_sim) < 3:
            sim_seen: Set[str] = {k, *existing_sim}
            strokes = row.get('strokes') or 0
            for comp_char in comp_in:
                for cand in by_component.get(comp_char, []):
                    if cand in sim_seen:
                        continue
                    cand_strokes = kanji_lookup[cand].get('strokes') or 0
                    if abs(int(cand_strokes) - int(strokes)) <= 2:
                        sim_seen.add(cand)
                        existing_sim.append(cand)
                    if len(existing_sim) >= 8:
                        break
                if len(existing_sim) >= 8:
                    break
        row['similar'] = existing_sim[:8]

        # 6. Grammatical / semantic booleans & enums
        row['dualisme'] = infer_dualisme(k, row.get('meanings_fr') or [], row.get('meanings_en') or [])
        row['isKeigo'] = [k in SONKEIGO_KANJIS, k in KENJOUGO_KANJIS]
        if k in SETSUZOKUSHI_KANJIS:
            row['isSetsuzokushi'] = True
        if k in KANDOUSHI_KANJIS:
            row['isKandoushi'] = True
        if k in PRONOUN_KANJIS:
            row['isPronoun'] = PRONOUN_KANJIS[k]
        elif not row.get('isPronoun'):
            row['isPronoun'] = 'false'

        if k in SOTO_KANJIS and k not in UCHI_KANJIS:
            row['sotoUchi'] = 'soto'
        elif k in UCHI_KANJIS and k not in SOTO_KANJIS:
            row['sotoUchi'] = 'uchi'
        else:
            row['sotoUchi'] = 'neutral'

        row['frequencyScore10'] = compute_kanji_freq_score_10(row.get('frequencies'))
        row['themes'] = infer_kanji_themes(row)

        fr_list = [str(m) for m in (row.get('meanings_fr') or []) if m and m != '-']
        en_list = [str(m) for m in (row.get('meanings_en') or []) if m and m != '-']
        row['senseProbabilities'] = build_sense_probabilities(fr_list if len(fr_list) >= 2 else en_list)
        row['strokeSvgCode'] = f'{ord(k):05x}'
        if not isinstance(row.get('images'), list):
            row['images'] = []

    new_schema = dict(old_schema)
    new_schema['frequencyScore10'] = 'integer'
    new_schema['themes'] = 'array'
    new_schema['sotoUchi'] = 'string'
    new_schema['senseProbabilities'] = 'array'
    new_schema['strokeSvgCode'] = 'string'
    new_schema['images'] = 'array'

    save_columnar_json(path, doc, new_schema, rows)
    print(f'[Kanji] Enriched {len(rows)} entries.')
    return kanji_jlpt_map


def infer_jukugo_pos_and_transitivity(word: str, feat: str, meaning_en: str) -> Tuple[str, str, str]:
    f = (feat or '').lower()
    m = (meaning_en or '').lower()

    transitivity = 'none'
    has_vi = 'intransitive' in f or 'v.i.' in f or 'intransitive' in m
    has_vt = 'transitive' in f and 'intransitive' not in f or 'v.t.' in f
    if has_vi and has_vt:
        transitivity = 'both'
    elif has_vi:
        transitivity = 'jidoushi'
    elif has_vt:
        transitivity = 'tadoushi'

    pos = 'noun'
    if 'ichidan' in f or 'ru-verb' in f:
        pos = 'verb_ichidan'
    elif 'godan' in f or 'u-verb' in f or 'verb' in f:
        pos = 'verb_irregular' if word.endswith(('する', '来る', 'くる')) else 'verb_godan'
    elif 'suru' in f or word.endswith('する'):
        pos = 'verb_irregular'
    elif 'na-adj' in f or 'adjectival noun' in f:
        pos = 'adj_na'
    elif 'i-adj' in f or ('adjective' in f and word.endswith('い')):
        pos = 'adj_i'
    elif 'adverb' in f:
        pos = 'adverb'
    elif 'conjunction' in f:
        pos = 'conjunction'
    elif 'preposition' in f or 'postposition' in f:
        pos = 'preposition'
    elif 'interjection' in f or 'exclamation' in f:
        pos = 'interjection'
    elif 'expression' in f or 'phrase' in f:
        pos = 'expression'

    affix = 'none'
    if 'prefix' in f:
        affix = 'prefix'
    elif 'suffix' in f:
        affix = 'suffix'

    return pos, transitivity, affix


def enrich_jukugo(kanji_jlpt_map: Dict[str, str]) -> None:
    path = os.path.join(DATA_DIR, 'jukugo_unified.json')
    doc, old_keys, rows = load_columnar_json(path)
    old_schema = dict(doc['schema']) if isinstance(doc['schema'], dict) else {k: 'string' for k in old_keys}

    rank_order = {'N5': 1, 'N4': 2, 'N3': 3, 'N2': 4, 'N1': 5, 'N0': 6}
    for row in rows:
        word = str(row.get('word') or '')
        kanji_chars = KANJI_RE.findall(word)
        row['kanjiCount'] = len(kanji_chars)
        row['scriptType'] = classify_script(word)

        # Derive JLPT level from constituent kanjis (with N0 for daily-life / N0 kanji)
        if kanji_chars:
            max_lvl = 'N5'
            max_rank = 0
            for ch in kanji_chars:
                lvl = kanji_jlpt_map.get(ch, 'N0')
                r = rank_order.get(lvl, 6)
                if r > max_rank:
                    max_rank = r
                    max_lvl = lvl
            row['jlpt'] = max_lvl
        else:
            freq = int(row.get('frequency') or 0)
            row['jlpt'] = 'N5' if freq >= 20000 else 'N0'

        pos, transitivity, affix = infer_jukugo_pos_and_transitivity(
            word,
            str(row.get('grammaticalFeature') or ''),
            str(row.get('meaning_en') or ''),
        )
        row['pos'] = pos
        row['transitivity'] = transitivity
        row['affixRole'] = affix
        row['frequencyScore10'] = compute_jukugo_freq_score_10(row.get('frequency'))

        meanings_split = [p.strip() for p in re.split(r'[;/]', str(row.get('meaning_en') or '')) if p.strip()]
        row['senseProbabilities'] = build_sense_probabilities(meanings_split)
        if not isinstance(row.get('images'), list):
            row['images'] = []

    new_schema = dict(old_schema)
    new_schema['jlpt'] = 'string'
    new_schema['scriptType'] = 'string'
    new_schema['pos'] = 'string'
    new_schema['transitivity'] = 'string'
    new_schema['affixRole'] = 'string'
    new_schema['kanjiCount'] = 'integer'
    new_schema['frequencyScore10'] = 'integer'
    new_schema['senseProbabilities'] = 'array'
    new_schema['images'] = 'array'

    save_columnar_json(path, doc, new_schema, rows)
    print(f'[Jukugo] Enriched {len(rows)} entries.')


def infer_slang_era_and_freq(row: Dict[str, Any]) -> Tuple[str, int]:
    blob = ' '.join([
        str(row.get('term') or ''),
        ' '.join(row.get('meaning') or []),
        ' '.join(row.get('note') or []),
        ' '.join(row.get('example') or []),
    ]).lower()

    if any(k in blob for k in ('tiktok', 'ai', 'z世代', 'gen z', '2020', '2021', '2022', '2023', '2024', '2025', '推し')):
        era = 'Années 2020 (SNS / Gen Z)'
        freq = 86
    elif any(k in blob for k in ('twitter', 'sns', 'line', 'youtube', '201', 'jk', 'gal', 'ギャル')):
        era = 'Années 2010 (Web / SNS)'
        freq = 72
    elif any(k in blob for k in ('heisei', '平成', '199', '200', '2ch', 'niconico')):
        era = 'Ère Heisei (1989–2019)'
        freq = 54
    elif any(k in blob for k in ('showa', 'shōwa', '昭和', '197', '198', 'retro', 'vintage')):
        era = 'Ère Shōwa (1926–1989)'
        freq = 32
    else:
        era = 'Contemporain / Courant'
        freq = 64

    return era, freq


def enrich_slang() -> None:
    path = os.path.join(DATA_DIR, 'slang_unified.json')
    doc, old_keys, rows = load_columnar_json(path)
    old_schema = dict(doc['schema']) if isinstance(doc['schema'], dict) else {k: 'string' for k in old_keys}

    for row in rows:
        era, freq = infer_slang_era_and_freq(row)
        row['era'] = era
        row['annualFrequency'] = freq
        row['lastFrequencyRefresh'] = '2026-01-01'
        if not isinstance(row.get('images'), list):
            row['images'] = []

    new_schema = dict(old_schema)
    new_schema['era'] = 'string'
    new_schema['annualFrequency'] = 'integer'
    new_schema['lastFrequencyRefresh'] = 'string'
    new_schema['images'] = 'array'

    save_columnar_json(path, doc, new_schema, rows)
    print(f'[Slang] Enriched {len(rows)} entries.')


def enrich_onomatopoeia() -> None:
    path = os.path.join(DATA_DIR, 'onomatopoeia_unified.json')
    doc, old_keys, rows = load_columnar_json(path)
    old_schema = dict(doc['schema']) if isinstance(doc['schema'], dict) else {k: 'string' for k in old_keys}

    term_set = {str(r.get('term') or '').strip() for r in rows}
    opp_map: Dict[str, Set[str]] = defaultdict(set)
    theme_map: Dict[str, str] = {}

    for a, b, theme in ONO_OPPOSITE_PAIRS:
        opp_map[a].add(b)
        opp_map[b].add(a)
        theme_map[a] = theme
        theme_map[b] = theme

    paired_count = 0
    for row in rows:
        term = str(row.get('term') or '').strip()
        opps = [o for o in sorted(opp_map.get(term, set())) if o in term_set]
        row['oppositeTerms'] = opps
        row['pairTheme'] = theme_map.get(term, '')
        if opps:
            paired_count += 1
        if not isinstance(row.get('images'), list):
            row['images'] = []

    new_schema = dict(old_schema)
    new_schema['oppositeTerms'] = 'array'
    new_schema['pairTheme'] = 'string'
    new_schema['images'] = 'array'

    save_columnar_json(path, doc, new_schema, rows)
    print(f'[Onomatopoeia] Enriched {len(rows)} entries ({paired_count} with opposite pairs).')


def main() -> None:
    kanji_jlpt_map = enrich_kanjis()
    enrich_jukugo(kanji_jlpt_map)
    enrich_slang()
    enrich_onomatopoeia()


if __name__ == '__main__':
    main()
