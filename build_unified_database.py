import json
import csv
import os
import glob
import re
import zipfile

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TMP_DIR = os.path.join(BASE_DIR, "public/tmp")
OUTPUT_DIR = os.path.join(BASE_DIR, "public/data")

os.makedirs(OUTPUT_DIR, exist_ok=True)

# -------------------------------------------------------------------
# 1. Alias map to resolve 100% of Romaji radical names to Kangxi Radicals
# -------------------------------------------------------------------
RADICAL_ALIASES = {
    'boo': '⼁', 'bou': '⼁', 'doogamae': '⼌', 'ennyoo': '⼏', 'fu': '⾉',
    'gyoogamae': '行', 'gyooninben': '彳', 'haha': '毋', 'hahanokan': '毋',
    'haneboo': '亅', 'hokogamae': '⼽', 'hokozukuri': '⼽', 'hoo': '方', 'hoohen': '方',
    'hotogi': '⼚', 'ichijuu': '亠', 'kabanehen': '尸', 'kakunokawa': '革', 'kawahen': '革',
    'kamigashira': '⼔', 'ku': '九', 'munyoo': '⽆', 'nichi': '日', 'nichihen': '日',
    'nobun': '攵', 'shi': '氏', 'shikashite': '而', 'suinyoo': '⽔', 'sukihen': '耒',
    'tomasu': '斗', 'tora': '⾁', 'toragashira': '虍', 'tsukanmuri': '冖', 'tsumekanmuri': '爫',
    'wakanmuri': '冖', 'yamaidare': '疒', 'yuube': '夕', 'tsuzumi': '鼓', 'shinnyoo': '⻌',
    'tsukue': '几', 'tetsu': '⾦', 'shikigamae': '弋', 'shoo': '⽚', 'uranai': '卜', 'ukebako': '凵'
}

# -------------------------------------------------------------------
# 2. Build Radicals Dictionary (`radicaux_liste.json`)
# -------------------------------------------------------------------
print("--- 1. Generating Radicals Dictionary (Keyed by Kangxi Character) ---")

radicals_csv_path = os.path.join(TMP_DIR, "perplexity/data/japanese-radicals.csv")
with open(radicals_csv_path, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    radicals_raw = list(reader)

rad_dict_data = {}
rad_lookup_map = {}

for row in radicals_raw:
    sym = row.get("Radical", "").strip()
    if not sym:
        continue
    strokes = int(row["Stroke#"].strip()) if row.get("Stroke#", "").strip().isdigit() else None
    meaning = row.get("Meaning", "").strip()
    reading_j = row.get("Reading-J", "").strip()
    reading_r = row.get("Reading-R", "").strip()
    pos_j = row.get("Position-J", "").strip()

    rad_dict_data[sym] = {
        "strokes": strokes,
        "meaning": meaning,
        "reading_j": reading_j,
        "reading_r": reading_r,
        "position_j": pos_j
    }

    # Index for name resolution
    if reading_r: rad_lookup_map[reading_r.lower()] = sym
    if reading_j: rad_lookup_map[reading_j] = sym
    if meaning: rad_lookup_map[meaning.lower()] = sym
    for m in meaning.lower().split(","):
        rad_lookup_map[m.strip()] = sym

for k, v in RADICAL_ALIASES.items():
    rad_lookup_map[k] = v

radicals_output = {
    "description": "Référentiel des 214 radicaux traditionnels japonais (Kangxi)",
    "total_radicals": len(rad_dict_data),
    "schema": {
        "strokes": "integer",
        "meaning": "string",
        "reading_j": "string",
        "reading_r": "string",
        "position_j": "string"
    },
    "data": rad_dict_data
}

with open(os.path.join(OUTPUT_DIR, "radicaux_liste.json"), "w", encoding="utf-8") as f:
    json.dump(radicals_output, f, ensure_ascii=False, indent=2)

print(f"✓ Radicaux générés ({len(rad_dict_data)} radicaux sous forme d'objet indexé par symbole)")

# -------------------------------------------------------------------
# 3. Load All Data Sources for Unified Kanji Database
# -------------------------------------------------------------------
print("--- 2. Loading Data Sources for Unified Kanji Database ---")

# A. kanjiDatabase_kanjis.json
with open(os.path.join(TMP_DIR, "kanjiDatabase_kanjis.json"), "r", encoding="utf-8") as f:
    db_kanjis = json.load(f)
db_kanjis_map = {item["Kanji"]: item for item in db_kanjis if "Kanji" in item}

# B. kanjiCategories.json
with open(os.path.join(TMP_DIR, "data/cateories/redone/kanjiCategories.json"), "r", encoding="utf-8") as f:
    kanji_categories = json.load(f)

# C. kanjiLevels.json
with open(os.path.join(TMP_DIR, "data/cateories/redone/kanjiLevels.json"), "r", encoding="utf-8") as f:
    kanji_levels = json.load(f)

# D. rtk_heisig_index.json
with open(os.path.join(TMP_DIR, "perplexity/output/rtk_heisig_index.json"), "r", encoding="utf-8") as f:
    rtk_raw = json.load(f)

rtk_map = {}
if isinstance(rtk_raw, dict) and "schema" in rtk_raw:
    schema_keys = list(rtk_raw["schema"].keys()) if isinstance(rtk_raw["schema"], dict) else rtk_raw["schema"]
    for row in rtk_raw["data"]:
        item = {schema_keys[i]: row[i] for i in range(len(schema_keys))}
        rtk_map[item["kanji"]] = item
elif isinstance(rtk_raw, list):
    rtk_map = {item["kanji"]: item for item in rtk_raw}

# E. wanikani_60_niveaux.json
with open(os.path.join(TMP_DIR, "perplexity/output/wanikani_60_niveaux.json"), "r", encoding="utf-8") as f:
    wanikani_raw = json.load(f)

wanikani_map = {}
if isinstance(wanikani_raw, dict) and "schema" in wanikani_raw:
    for row in wanikani_raw["data"]:
        wanikani_map[row[0]] = row[1]
elif isinstance(wanikani_raw, dict):
    for lvl_str, k_list in wanikani_raw.items():
        lvl_num = int(lvl_str.split("_")[1])
        for k in k_list:
            wanikani_map[k] = lvl_num

# F. frequences_combinees.json
with open(os.path.join(TMP_DIR, "perplexity/output/frequences_combinees.json"), "r", encoding="utf-8") as f:
    freq_raw = json.load(f)

freq_map = {}
if isinstance(freq_raw, dict) and "schema" in freq_raw:
    for row in freq_raw["data"]:
        kanji_char = row[0]
        freq_map[kanji_char] = {
            "aozora": row[1],
            "news": row[2],
            "twitter": row[3],
            "wikipedia": row[4],
            "innocent_rank": row[5],
            "innocent_count": row[6]
        }
elif isinstance(freq_raw, dict) and "kanji_frequencies" in freq_raw:
    freq_map = freq_raw["kanji_frequencies"]

# G. KANJIDIC (English) zip (local Yomitan archive with SKIP, strokes, grade, kana readings, Nelson)
kanjidic_map = {}
kanjidic_zip = os.path.join(TMP_DIR, "perplexity/yomitan___MarvNC/util/[Kanji] KANJIDIC (English).zip")
if os.path.exists(kanjidic_zip):
    with zipfile.ZipFile(kanjidic_zip) as zf:
        for bank_name in sorted(n for n in zf.namelist() if n.startswith("kanji_bank_") and n.endswith(".json")):
            bank_rows = json.loads(zf.read(bank_name).decode("utf-8"))
            for item in bank_rows:
                ch = item[0]
                kanjidic_map[ch] = {
                    "on": [x.strip() for x in item[1].split() if x.strip()],
                    "kun": [x.strip() for x in item[2].split() if x.strip()],
                    "tag": item[3],
                    "meanings": item[4] if isinstance(item[4], list) else [],
                    "meta": item[5] if isinstance(item[5], dict) else {},
                }

# H. kanji-wanikani.json
wk_detail_map = {}
wk_detail_path = os.path.join(TMP_DIR, "perplexity/data/kanji-wanikani.json")
if os.path.exists(wk_detail_path):
    with open(wk_detail_path, "r", encoding="utf-8") as f:
        wk_detail_map = json.load(f)

# I. JLPT local per-level files (jlpt-n0..n5.json + yomiwa)
jlpt_files_map = {}
for lvl_num in range(6):
    jp_path = os.path.join(TMP_DIR, f"data/jlpt-n{lvl_num}.json")
    if os.path.exists(jp_path):
        with open(jp_path, "r", encoding="utf-8") as f:
            for item in json.load(f):
                k_ch = item.get("kanji")
                if k_ch:
                    jlpt_files_map[k_ch] = item

yomiwa_n5_map = {}
yomiwa_n5_path = os.path.join(TMP_DIR, "data/yomiwa/N5.json")
if os.path.exists(yomiwa_n5_path):
    with open(yomiwa_n5_path, "r", encoding="utf-8") as f:
        for item in json.load(f):
            if item.get("kanji"):
                yomiwa_n5_map[item["kanji"]] = item

yomiwa_level_map = {}
for lvl_num in range(1, 6):
    ytxt_path = os.path.join(TMP_DIR, f"data/yomiwa/JLPT{lvl_num}.txt")
    if os.path.exists(ytxt_path):
        with open(ytxt_path, "r", encoding="utf-8") as f:
            raw_txt = f.read().strip()
        if raw_txt:
            ydata = json.loads(raw_txt)
            for k_ch in ydata.get("IDs", []):
                yomiwa_level_map[k_ch] = f"N{lvl_num}"

# J. French meanings + similar kanjis (gemini-n1..n5.json, gn4.json, gn5.json)
gemini_map = {}
similar_map = {}

for lvl_num in [5, 4, 3, 2]:
    g_path = os.path.join(TMP_DIR, f"data/gemini-n{lvl_num}.json")
    if os.path.exists(g_path):
        with open(g_path, "r", encoding="utf-8") as f:
            g_raw = json.load(f)
        for raw_entry in g_raw:
            sub_items = raw_entry if isinstance(raw_entry, list) else [raw_entry]
            for item in sub_items:
                if not isinstance(item, dict):
                    continue
                k_ch = item.get("kanji")
                if isinstance(k_ch, list):
                    for kc in k_ch:
                        for other in k_ch:
                            if other != kc:
                                similar_map.setdefault(kc, [])
                                if other not in similar_map[kc]:
                                    similar_map[kc].append(other)
                    continue
                if not isinstance(k_ch, str):
                    continue
                gemini_map[k_ch] = item.get("meaning", "")
                for sim in item.get("similar", []):
                    sk = sim.get("kanji") if isinstance(sim, dict) else None
                    if sk and sk != k_ch:
                        similar_map.setdefault(k_ch, [])
                        if sk not in similar_map[k_ch]:
                            similar_map[k_ch].append(sk)

gemini_n1_path = os.path.join(TMP_DIR, "data/gemini-n1.json")
if os.path.exists(gemini_n1_path):
    with open(gemini_n1_path, "r", encoding="utf-8") as f:
        gn1_raw = json.load(f)
    for group in gn1_raw:
        items = group if isinstance(group, list) else [group]
        for grp in items:
            ks = grp.get("kanji", []) if isinstance(grp, dict) else []
            for k_ch in ks:
                for other in ks:
                    if other != k_ch:
                        similar_map.setdefault(k_ch, [])
                        if other not in similar_map[k_ch]:
                            similar_map[k_ch].append(other)

for gn_file in ["data/gn4.json", "data/gn5.json"]:
    gn_path = os.path.join(TMP_DIR, gn_file)
    if os.path.exists(gn_path):
        with open(gn_path, "r", encoding="utf-8") as f:
            gn_data = json.load(f)
        for k_ch, sims in gn_data.items():
            for sk in sims:
                if sk != k_ch:
                    similar_map.setdefault(k_ch, [])
                    if sk not in similar_map[k_ch]:
                        similar_map[k_ch].append(sk)

# K. Kanji synonyms (kanji-synonyms.json)
synonyms_map = {}
syn_path = os.path.join(TMP_DIR, "data/kanji-synonyms.json")
if os.path.exists(syn_path):
    with open(syn_path, "r", encoding="utf-8") as f:
        syn_raw = json.load(f)
    for grp in syn_raw.get("synonymGroups", []):
        members = [m.get("kanji") for m in grp.get("kanji", []) if m.get("kanji")]
        for k_ch in members:
            synonyms_map.setdefault(k_ch, [])
            for other in members:
                if other != k_ch and other not in synonyms_map[k_ch]:
                    synonyms_map[k_ch].append(other)

# L. Kanji variants (Shinjitai / Kyujitai / Mozc variants)
variants_map = {}


def add_variant(k_char, v_char):
    if not k_char or not v_char or k_char == v_char:
        return
    variants_map.setdefault(k_char, [])
    if v_char not in variants_map[k_char]:
        variants_map[k_char].append(v_char)


jitai_zip = os.path.join(TMP_DIR, "perplexity/yomitan___MarvNC/dl/[Kanji] jitai.zip")
if os.path.exists(jitai_zip):
    with zipfile.ZipFile(jitai_zip) as zf:
        for row in json.loads(zf.read("kanji_bank_1.json").decode("utf-8")):
            base_k = row[0]
            for note in row[4]:
                for lbl in ["旧字体:", "新字体:", "異体字:", "本字:", "正字:"]:
                    if note.startswith(lbl):
                        after_colon = note[len(lbl):]
                        for found in re.findall(r"[\u4e00-\u9fff\u3400-\u4dbf\U00020000-\U0002ebef]", after_colon):
                            add_variant(base_k, found)
                            add_variant(found, base_k)

mozc_zip = os.path.join(TMP_DIR, "perplexity/yomitan___MarvNC/dl/[Kanji] mozc Kanji Variants.zip")
if os.path.exists(mozc_zip):
    with zipfile.ZipFile(mozc_zip) as zf:
        for row in json.loads(zf.read("kanji_bank_1.json").decode("utf-8")):
            base_k = row[0]
            for note in row[4]:
                if "is more popular" in note or "printed form" in note:
                    for found in re.findall(r"[\u4e00-\u9fff\u3400-\u4dbf\U00020000-\U0002ebef]", note):
                        add_variant(base_k, found)

# M. Jukugo index (jukugo.json['list'] + kanjiDatabase_jukugo.json)
jukugo_entries = {}  # word -> {word, reading, meaning_en, frequency, grammaticalFeature}
starting_w_map = {}
ending_w_map = {}

kdb_jukugo_path = os.path.join(TMP_DIR, "kanjiDatabase_jukugo.json")
if os.path.exists(kdb_jukugo_path):
    with open(kdb_jukugo_path, "r", encoding="utf-8") as f:
        for item in json.load(f):
            word = str(item.get("Comp. Word", "")).strip()
            if not word:
                continue
            freq_val = int(item.get("Frequency") or 0)
            reading_val = str(item.get("Pronunciation", "")).strip()
            meaning_val = str(item.get("English Translation", "")).strip()
            gram_val = str(item.get("Grammatical Feature", "")).strip()
            jukugo_entries[word] = {
                "word": word,
                "reading": reading_val,
                "meaning_en": meaning_val,
                "frequency": freq_val,
                "grammaticalFeature": gram_val,
            }
            if len(word) >= 2:
                starting_w_map.setdefault(word[0], []).append((freq_val, word))
                ending_w_map.setdefault(word[-1], []).append((freq_val, word))

jukugo_path = os.path.join(TMP_DIR, "jukugo.json")
if os.path.exists(jukugo_path):
    with open(jukugo_path, "r", encoding="utf-8") as f:
        jukugo_raw = json.load(f)
    for entry in jukugo_raw.get("list", []):
        k_char = entry.get("i")
        if not k_char:
            continue
        for raw_str in entry.get("jukugo", []):
            if not isinstance(raw_str, str):
                continue
            parts = [p.strip() for p in raw_str.split(" - ", 2)]
            word = parts[0] if parts else ""
            reading = parts[1] if len(parts) > 1 else ""
            meaning = parts[2] if len(parts) > 2 else ""
            if not word:
                continue
            if word not in jukugo_entries:
                jukugo_entries[word] = {
                    "word": word,
                    "reading": reading,
                    "meaning_en": meaning,
                    "frequency": 0,
                    "grammaticalFeature": "",
                }
            if len(word) >= 2:
                if word.startswith(k_char):
                    starting_w_map.setdefault(k_char, []).append((500000, word))
                if word.endswith(k_char):
                    ending_w_map.setdefault(k_char, []).append((500000, word))

# Collect all unique Kanji characters across primary sources (exclude unpaired UTF-16 surrogates)
def is_valid_kanji_key(ch):
    if not isinstance(ch, str) or not ch.strip():
        return False
    return all(not (0xD800 <= ord(c) <= 0xDFFF) for c in ch)


all_kanji_chars = {
    ch
    for ch in (
        set(db_kanjis_map.keys())
        .union(set(rtk_map.keys()))
        .union(set(jlpt_files_map.keys()))
        .union(set(kanji_levels.keys()))
    )
    if is_valid_kanji_key(ch)
}

print(f"Total unique Kanjis to unify: {len(all_kanji_chars)}")

# -------------------------------------------------------------------
# 4. Construct Unified Kanji Database (Schema Object + Data Array-of-Arrays)
# -------------------------------------------------------------------
def is_clean_kana(token):
    if not token or token == "-":
        return False
    if re.search(r"[A-Za-z0-9]", token):
        return False
    return bool(re.search(r"[\u3040-\u309f\u30a0-\u30ff]", token))


def hira_to_kata(text):
    out = []
    for ch in text:
        code = ord(ch)
        if 0x3041 <= code <= 0x3096:
            out.append(chr(code + 0x60))
        else:
            out.append(ch)
    return "".join(out)


def dedupe_preserve(items):
    seen = set()
    res = []
    for x in items:
        s = x.strip() if isinstance(x, str) else x
        if s and s not in seen:
            seen.add(s)
            res.append(s)
    return res


def normalize_jlpt(db_item, rtk_item, jlpt_item, wk_item, k_char):
    lvl = kanji_levels.get(k_char) or yomiwa_level_map.get(k_char)
    if not lvl and jlpt_item and jlpt_item.get("level") in ["N5", "N4", "N3", "N2", "N1"]:
        lvl = jlpt_item["level"]
    if not lvl and wk_item and wk_item.get("jlpt_new") in [1, 2, 3, 4, 5]:
        lvl = f"N{wk_item['jlpt_new']}"
    if not lvl and rtk_item.get("jlpt") in ["N5", "N4", "N3", "N2", "N1"]:
        lvl = rtk_item["jlpt"]
    if not lvl and db_item.get("JLPT-test") in [1, 2, 3, 4, 5]:
        lvl = f"N{db_item['JLPT-test']}"
    if not lvl and kanjidic_map.get(k_char, {}).get("meta", {}).get("jlpt") in ["1", "2", "3", "4"]:
        # KANJIDIC uses old JLPT 1-4; only fallback if no modern N-level matched
        old_to_new = {"4": "N5", "3": "N4", "2": "N2", "1": "N1"}
        lvl = old_to_new.get(kanjidic_map[k_char]["meta"]["jlpt"], "N0")
    if lvl not in ["N5", "N4", "N3", "N2", "N1"]:
        return "N0"
    return lvl


schema_dict = {
    "kanji": "string",
    "uuid": "string",
    "jlpt": "string",
    "grade": "integer | string",
    "strokes": "integer",
    "radical": "string",
    "radical_name_en": "string",
    "category": "string",
    "subCategory": "string",
    "classification": "string",
    "skipCode": "string",
    "compositionsSKIP": "array",
    "nelson": "integer",
    "on_readings": "array",
    "kun_readings": "array",
    "nanori": "array",
    "meanings_fr": "array",
    "meanings_en": "array",
    "rtk_5th": "integer",
    "rtk_6th": "integer",
    "rtk_keyword_5th": "string",
    "rtk_keyword_6th": "string",
    "rtk_components": "string",
    "wanikani_level": "integer",
    "frequencies": "object",
    "isVerbe": "string",
    "isAdj": "string",
    "dualisme": "integer",
    "isKeigo": "array",
    "isProperName": "boolean",
    "isSetsuzokushi": "boolean",
    "isKandoushi": "boolean",
    "isPronoun": "string",
    "type": "string",
    "synonyms": "array",
    "antonyms": "array",
    "homonyms": "array",
    "startingW": "array",
    "endingW": "array",
    "encodage": "object",
    "kanjidb_extra": "object",
    "similar": "array",
    "variants": "array"
}

unified_rows = []

for idx, k in enumerate(sorted(all_kanji_chars), start=1):
    db_item = db_kanjis_map.get(k, {})
    rtk_item = rtk_map.get(k, {})
    kdic_item = kanjidic_map.get(k, {})
    kdic_meta = kdic_item.get("meta", {})
    jlpt_item = jlpt_files_map.get(k, {})
    wk_item = wk_detail_map.get(k, {})
    yomiwa_item = yomiwa_n5_map.get(k, {})

    # 1. Normaliser JLPT Level ("N5", "N4", "N3", "N2", "N1", "N0")
    lvl = normalize_jlpt(db_item, rtk_item, jlpt_item, wk_item, k)

    # 2. Catégorie & Sous-Catégorie Sémantique
    cat_pair = kanji_categories.get(k, ["Non classifié", "Général"])
    category = cat_pair[0] if isinstance(cat_pair, list) and len(cat_pair) > 0 else "Non classifié"
    sub_category = cat_pair[1] if isinstance(cat_pair, list) and len(cat_pair) > 1 else "Général"

    # 3. Traits & Grade
    raw_strokes = db_item.get("Strokes") or kdic_meta.get("strokes") or wk_item.get("strokes") or rtk_item.get("stroke_count")
    strokes = int(raw_strokes) if str(raw_strokes).isdigit() else None
    raw_grade = db_item.get("Grade") or kdic_meta.get("grade") or wk_item.get("grade")
    grade = int(raw_grade) if raw_grade not in (None, "", "N0") and str(raw_grade).isdigit() else "N0"

    # 4. Radical Symbol & Name
    rad_name_en = db_item.get("Name of Radical", "").strip()
    rad_sym = rad_lookup_map.get(rad_name_en.lower())
    if not rad_sym and rad_name_en:
        parts = [p.strip() for p in rad_name_en.replace(",", " ").split() if p.strip()]
        for p in parts:
            if p.lower() in rad_lookup_map:
                rad_sym = rad_lookup_map[p.lower()]
                break
    if not rad_sym:
        rad_sym = "⼀"  # default fallback

    # 5. Classification
    classification = db_item.get("Kanji Classification") or kdic_item.get("tag") or ("Jinmeiyō" if rtk_item else "N0")

    # 6. SKIP & Nelson (KANJIDIC fournit les vrais codes SKIP)
    skip_code = kdic_meta.get("skip") or db_item.get("SKIP") or "0-0-0"
    nelson_raw = db_item.get("Kanji ID in Nelson") or kdic_meta.get("nelson_c") or kdic_meta.get("nelson_n")
    nelson_id = int(nelson_raw) if str(nelson_raw).isdigit() else None

    # 7. Readings (ON in Katakana, KUN in Hiragana, Nanori — sans romaji/ASCII)
    on_candidates = []
    on_candidates.extend(kdic_item.get("on", []))
    on_candidates.extend(jlpt_item.get("onyomi", []))
    on_candidates.extend(yomiwa_item.get("onyomi", []))
    on_candidates.extend([hira_to_kata(r) for r in wk_item.get("readings_on", []) if is_clean_kana(r)])
    for raw_on in [db_item.get("Reading within Joyo", ""), db_item.get("Reading beyond Joyo", "")]:
        for tok in re.split(r"[;|,、\s]+", str(raw_on)):
            if re.search(r"[\u30a0-\u30ff]", tok) and is_clean_kana(tok):
                on_candidates.append(tok)
    on_readings = dedupe_preserve([r for r in on_candidates if is_clean_kana(r)])

    kun_candidates = []
    kun_candidates.extend(kdic_item.get("kun", []))
    kun_candidates.extend(jlpt_item.get("kunyomi", []))
    kun_candidates.extend(yomiwa_item.get("kunyomi", []))
    kun_candidates.extend([r for r in wk_item.get("readings_kun", []) if is_clean_kana(r)])
    for raw_kun in [db_item.get("Reading within Joyo", ""), db_item.get("Reading beyond Joyo", "")]:
        for tok in re.split(r"[;|,、\s]+", str(raw_kun)):
            if re.search(r"[\u3040-\u309f]", tok) and is_clean_kana(tok):
                kun_candidates.append(tok)
    kun_readings = dedupe_preserve([r for r in kun_candidates if is_clean_kana(r)])

    nanori = dedupe_preserve([r for r in yomiwa_item.get("nanori", []) if is_clean_kana(r)])

    # 8. Meanings (FR strictement depuis sources FR ; EN depuis KANJIDIC/JLPT/WaniKani/DB)
    fr_candidates = []
    if k in gemini_map and gemini_map[k]:
        fr_candidates.extend([x.strip() for x in re.split(r"[,;]+", gemini_map[k]) if x.strip()])
    if yomiwa_item.get("frenchMeaning"):
        fr_candidates.extend([x.strip() for x in re.split(r"[,;]+", yomiwa_item["frenchMeaning"]) if x.strip()])
    meanings_fr = dedupe_preserve(fr_candidates)

    en_candidates = []
    en_candidates.extend(kdic_item.get("meanings", []))
    en_candidates.extend(jlpt_item.get("meaning", []))
    en_candidates.extend(wk_item.get("meanings", []))
    for db_en_field in ["Translation of On", "Translation of Kun"]:
        raw_en = str(db_item.get(db_en_field, "")).strip()
        if raw_en and raw_en != "-":
            en_candidates.extend([x.strip() for x in re.split(r"[,;]+", raw_en) if x.strip() and x.strip() != "-"])
    if rtk_item.get("keyword_6th"):
        en_candidates.append(rtk_item["keyword_6th"])
    meanings_en = dedupe_preserve(en_candidates)

    # 9. RTK & WaniKani
    rtk_5th = rtk_item.get("rtk_5th")
    rtk_6th = rtk_item.get("rtk_6th")
    rtk_kw5 = rtk_item.get("keyword_5th", "")
    rtk_kw6 = rtk_item.get("keyword_6th", "")
    rtk_comps = rtk_item.get("components", "")
    wk_level = wanikani_map.get(k) or wk_item.get("wk_level")

    # 10. Fréquences multi-corpus
    frequencies = freq_map.get(k, {})

    # 11. Drapeaux Grammaticaux & Sémantiques (correction bug truthy "false")
    cat_lower = category.lower()
    sub_lower = sub_category.lower()
    is_verbe = "godan" if ("動詞" in category or "verbe" in cat_lower or "verbes" in sub_lower) else "false"
    is_adj = "i" if ("形容詞" in category or "adjectif" in cat_lower or "qualite" in sub_lower) else "false"
    dualisme = 0
    is_keigo = [False, False]
    is_proper_name = ("jinmei" in classification.lower()) or grade == "N0"
    is_setsuzokushi = "接続" in category or "conjonction" in cat_lower
    is_kandoushi = "感動" in category or "感动" in category or "interjection" in cat_lower
    is_pronoun = "false"

    if is_verbe != "false":
        type_gram = "verbe"
    elif is_adj != "false":
        type_gram = "adjectif"
    elif is_setsuzokushi:
        type_gram = "conjonction"
    elif is_kandoushi:
        type_gram = "interjection"
    else:
        type_gram = "nom"

    # 12. Jukugo starting & ending (priorisés par fréquence)
    sw_sorted = sorted(set(starting_w_map.get(k, [])), key=lambda x: (-x[0], len(x[1]), x[1]))
    ew_sorted = sorted(set(ending_w_map.get(k, [])), key=lambda x: (-x[0], len(x[1]), x[1]))
    starting_w = dedupe_preserve([w for _, w in sw_sorted])[:12]
    ending_w = dedupe_preserve([w for _, w in ew_sorted])[:12]

    # 13. Encodages CJK
    hex_unicode = f"U+{ord(k):04X}"
    encodage = {
        "unicode": hex_unicode,
        "utf8": k.encode("utf-8").hex().upper(),
    }
    if kdic_meta.get("jis208"):
        encodage["jis"] = kdic_meta["jis208"]

    # 14. Statistique Extra
    kanjidb_extra = {}
    if db_item:
        for extra_key in ["Left Entropy", "Right Entropy", "Left Kanji Prod.", "Right Kanji Prod.", "Symmetry"]:
            if extra_key in db_item:
                kanjidb_extra[extra_key] = db_item[extra_key]

    synonyms = synonyms_map.get(k, [])
    similar = similar_map.get(k, [])
    variants = variants_map.get(k, [])

    row = [
        k,
        f"kanji-{idx:04d}",
        lvl,
        grade,
        strokes,
        rad_sym,
        rad_name_en,
        category,
        sub_category,
        classification,
        skip_code,
        [],
        nelson_id,
        on_readings,
        kun_readings,
        nanori,
        meanings_fr,
        meanings_en,
        rtk_5th,
        rtk_6th,
        rtk_kw5,
        rtk_kw6,
        rtk_comps,
        wk_level,
        frequencies,
        is_verbe,
        is_adj,
        dualisme,
        is_keigo,
        is_proper_name,
        is_setsuzokushi,
        is_kandoushi,
        is_pronoun,
        type_gram,
        synonyms,
        [],
        [],
        starting_w,
        ending_w,
        encodage,
        kanjidb_extra,
        similar,
        variants,
    ]

    unified_rows.append(row)

unified_output = {
    "description": "Base de données unifiée et exhaustive des Kanjis pour eJLPT",
    "version": "2.0",
    "total_kanji": len(unified_rows),
    "schema": schema_dict,
    "data": unified_rows
}

with open(os.path.join(OUTPUT_DIR, "kanjiDatabase_unified.json"), "w", encoding="utf-8") as f:
    json.dump(unified_output, f, ensure_ascii=False, separators=(",", ":"))

print(f"✓ Base de données unifiée générée ({len(unified_rows)} kanjis)")

# -------------------------------------------------------------------
# 5. Export Remaining Unified Datasets to `public/data/`
# -------------------------------------------------------------------
print("--- 3. Exporting Unified Datasets to public/data/ ---")

# Combined Frequencies (handles { schema, data } from generate_kanji_categories.py)
freq_schema = {
    "kanji": "string",
    "aozora": "integer",
    "news": "integer",
    "twitter": "integer",
    "wikipedia": "integer",
    "innocent_rank": "integer",
    "innocent_count": "integer"
}

freq_rows = []
for kanji_char, metrics in freq_map.items():
    freq_rows.append([
        kanji_char,
        metrics.get("aozora"),
        metrics.get("news"),
        metrics.get("twitter"),
        metrics.get("wikipedia"),
        metrics.get("innocent_rank"),
        metrics.get("innocent_count")
    ])

freq_output = {
    "description": "Matrice de fréquences combinées multi-corpus pour eJLPT",
    "corpora_included": freq_raw.get("corpora_included", []),
    "total_kanji": len(freq_rows),
    "schema": freq_schema,
    "data": freq_rows
}

with open(os.path.join(OUTPUT_DIR, "frequences_combinees.json"), "w", encoding="utf-8") as f:
    json.dump(freq_output, f, ensure_ascii=False, separators=(",", ":"))
print(f"✓ Fréquences exportées ({len(freq_rows)} kanjis)")

# Export Jukugo Unified
jukugo_list_sorted = sorted(
    jukugo_entries.values(),
    key=lambda x: (-x["frequency"], x["word"])
)
jukugo_rows = [
    [j["word"], j["reading"], j["meaning_en"], j["frequency"], j["grammaticalFeature"]]
    for j in jukugo_list_sorted
]
jukugo_output = {
    "description": "Composés Jukugo unifiés avec fréquence et traduction",
    "total_jukugo": len(jukugo_rows),
    "schema": {
        "word": "string",
        "reading": "string",
        "meaning_en": "string",
        "frequency": "integer",
        "grammaticalFeature": "string"
    },
    "data": jukugo_rows
}
with open(os.path.join(OUTPUT_DIR, "jukugo_unified.json"), "w", encoding="utf-8") as f:
    json.dump(jukugo_output, f, ensure_ascii=False, separators=(",", ":"))
print(f"✓ Jukugo unifiés exportés ({len(jukugo_rows)} composés)")

# Copy Slang
slang_src = os.path.join(TMP_DIR, "perplexity/output/slang_japonais.json")
with open(slang_src, "r", encoding="utf-8") as f:
    slang_json = json.load(f)
with open(os.path.join(OUTPUT_DIR, "slang_unified.json"), "w", encoding="utf-8") as f:
    json.dump(slang_json, f, ensure_ascii=False, separators=(",", ":"))

# Copy Grammar Particles (4 sources)
grammar_src = os.path.join(TMP_DIR, "perplexity/output/particules_grammaire.json")
with open(grammar_src, "r", encoding="utf-8") as f:
    grammar_json = json.load(f)
with open(os.path.join(OUTPUT_DIR, "grammar_unified.json"), "w", encoding="utf-8") as f:
    json.dump(grammar_json, f, ensure_ascii=False, separators=(",", ":"))

# Copy Onomatopoeia (SuraSura)
ono_src = os.path.join(TMP_DIR, "perplexity/output/onomatopoeia_japonais.json")
with open(ono_src, "r", encoding="utf-8") as f:
    ono_json = json.load(f)
with open(os.path.join(OUTPUT_DIR, "onomatopoeia_unified.json"), "w", encoding="utf-8") as f:
    json.dump(ono_json, f, ensure_ascii=False, separators=(",", ":"))

# Copy Composition Graph
comp_src = glob.glob(os.path.join(TMP_DIR, "**/composition.json"), recursive=True)[0]
with open(comp_src, "r", encoding="utf-8") as f:
    comp_data = json.load(f)
with open(os.path.join(OUTPUT_DIR, "composition.json"), "w", encoding="utf-8") as f:
    json.dump(comp_data, f, ensure_ascii=False, separators=(",", ":"))

print("\n🎉 TOUS LES FICHIERS UNIFIÉS DE PUBLIC/DATA/ ONT ÉTÉ GÉNÉRÉS SANS ERREUR !")
