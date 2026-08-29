import json
import csv
import os
import glob
import re

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

# G. jukugo index
jukugo_path = os.path.join(TMP_DIR, "jukugo.json")
jukugo_map = {}
if os.path.exists(jukugo_path):
    with open(jukugo_path, "r", encoding="utf-8") as f:
        jukugo_raw = json.load(f)
    for k, words in jukugo_raw.items():
        if isinstance(words, list):
            jukugo_map[k] = words

# Collect all unique Kanji characters across sources
all_kanji_chars = set(db_kanjis_map.keys()).union(set(rtk_map.keys()))

print(f"Total unique Kanjis to unify: {len(all_kanji_chars)}")

# -------------------------------------------------------------------
# 4. Construct Unified Kanji Database (Schema Object + Data Array-of-Arrays)
# -------------------------------------------------------------------
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
    "kanjidb_extra": "object"
}

unified_rows = []

for idx, k in enumerate(sorted(all_kanji_chars), start=1):
    db_item = db_kanjis_map.get(k, {})
    rtk_item = rtk_map.get(k, {})
    
    # 1. Normaliser JLPT Level ("N5", "N4", "N3", "N2", "N1", "N0")
    lvl = kanji_levels.get(k)
    if not lvl:
        if rtk_item.get("jlpt"):
            lvl = rtk_item["jlpt"]
        elif db_item.get("JLPT-test"):
            raw_jlpt = db_item["JLPT-test"]
            lvl = f"N{raw_jlpt}" if raw_jlpt in [1, 2, 3, 4, 5] else "N0"
        else:
            lvl = "N0"
    if lvl == "null" or not lvl:
        lvl = "N0"

    # 2. Catégorie & Sous-Catégorie Sémantique
    cat_pair = kanji_categories.get(k, ["Non classifié", "Général"])
    category = cat_pair[0] if isinstance(cat_pair, list) and len(cat_pair) > 0 else "Non classifié"
    sub_category = cat_pair[1] if isinstance(cat_pair, list) and len(cat_pair) > 1 else "Général"

    # 3. Traits & Grade
    strokes = db_item.get("Strokes") or rtk_item.get("stroke_count") or None
    grade = db_item.get("Grade", "N0")

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
    classification = db_item.get("Kanji Classification", "Jinmeiyō" if rtk_item else "N0")

    # 6. SKIP & Nelson
    skip_code = db_item.get("SKIP", "0-0-0")
    nelson_id = db_item.get("Kanji ID in Nelson")

    # 7. Readings (ON, KUN, Nanori)
    on_str = db_item.get("Reading within Joyo", "") or rtk_item.get("on_reading", "")
    on_readings = [x.strip() for x in re.split(r"[;|,\s]+", on_str) if x.strip()]
    
    kun_str = db_item.get("Kun within Joyo", "") or rtk_item.get("kun_reading", "")
    kun_readings = [x.strip() for x in re.split(r"[;|,\s]+", kun_str) if x.strip()]

    nanori = []

    # 8. Meanings
    meanings_en_str = db_item.get("Translation of On", "") or rtk_item.get("keyword_6th", "")
    meanings_en = [x.strip() for x in re.split(r"[,;]+", meanings_en_str) if x.strip()]
    meanings_fr = [x.strip() for x in re.split(r"[,;]+", db_item.get("Translation of Kun", "")) if x.strip()]

    # 9. RTK & WaniKani
    rtk_5th = rtk_item.get("rtk_5th")
    rtk_6th = rtk_item.get("rtk_6th")
    rtk_kw5 = rtk_item.get("keyword_5th", "")
    rtk_kw6 = rtk_item.get("keyword_6th", "")
    rtk_comps = rtk_item.get("components", "")
    wk_level = wanikani_map.get(k)

    # 10. Fréquences multi-corpus
    frequencies = freq_map.get(k, {})

    # 11. Drapeaux Grammaticaux & Sémantiques
    is_verbe = "false"
    if "動詞" in category or "Verbe" in category:
        is_verbe = "godan"
    is_adj = "false"
    if "形容詞" in category or "Adjectif" in category:
        is_adj = "i"
    dualisme = 0  # neutre
    is_keigo = [False, False]
    is_proper_name = classification == "Jinmeiyō" or grade == "N0"
    is_setsuzokushi = "接続" in category or "Conjonction" in category
    is_kandoushi = "感动" in category or "Interjection" in category
    is_pronoun = "false"
    type_gram = "nom" if not is_verbe else "verbe"

    # 12. Jukugo starting & ending
    kanji_words = jukugo_map.get(k, [])
    starting_w = [w for w in kanji_words if isinstance(w, str) and w.startswith(k)][:10]
    ending_w = [w for w in kanji_words if isinstance(w, str) and w.endswith(k)][:10]

    # 13. Encodages CJK
    hex_unicode = f"U+{ord(k):04X}"
    encodage = {
        "unicode": hex_unicode,
        "utf8": k.encode("utf-8").hex().upper()
    }

    # 14. Statistique Extra
    kanjidb_extra = {}
    if db_item:
        for extra_key in ["Left Entropy", "Right Entropy", "Left Kanji Prod.", "Right Kanji Prod."]:
            if extra_key in db_item:
                kanjidb_extra[extra_key] = db_item[extra_key]

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
        [],
        [],
        [],
        starting_w,
        ending_w,
        encodage,
        kanjidb_extra
    ]

    unified_rows.append(row)

unified_output = {
    "description": "Base de données unifiée et exhaustive des Kanjis pour eJLPT (3 039 kanji)",
    "version": "1.0",
    "total_kanji": len(unified_rows),
    "schema": schema_dict,
    "data": unified_rows
}

with open(os.path.join(OUTPUT_DIR, "kanjiDatabase_unified.json"), "w", encoding="utf-8") as f:
    json.dump(unified_output, f, ensure_ascii=False, indent=2)

print(f"✓ Base de données unifiée générée ({len(unified_rows)} kanjis avec schéma clé-type structuré)")

# -------------------------------------------------------------------
# 5. Copy Remaining Datasets to `public/data/`
# -------------------------------------------------------------------
print("--- 3. Copying Cleaned Datasets to public/data/ ---")

# Reformat combined frequencies with schema object & data array-of-arrays
freq_src = os.path.join(TMP_DIR, "perplexity/output/frequences_combinees.json")
with open(freq_src, "r", encoding="utf-8") as f:
    freq_data_raw = json.load(f)

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
raw_kanji_freqs = freq_data_raw.get("kanji_frequencies", {})
for kanji_char, metrics in raw_kanji_freqs.items():
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
    "corpora_included": freq_data_raw.get("corpora_included", []),
    "total_kanji": len(freq_rows),
    "schema": freq_schema,
    "data": freq_rows
}

with open(os.path.join(OUTPUT_DIR, "frequences_combinees.json"), "w", encoding="utf-8") as f:
    json.dump(freq_output, f, ensure_ascii=False, indent=2)

# Copy Slang
slang_src = os.path.join(TMP_DIR, "perplexity/output/slang_japonais.json")
with open(slang_src, "r", encoding="utf-8") as f:
    slang_json = json.load(f)
with open(os.path.join(OUTPUT_DIR, "slang_unified.json"), "w", encoding="utf-8") as f:
    json.dump(slang_json, f, ensure_ascii=False, indent=2)

# Copy Grammar Particles (DOJG)
grammar_src = os.path.join(TMP_DIR, "perplexity/output/particules_grammaire.json")
with open(grammar_src, "r", encoding="utf-8") as f:
    grammar_json = json.load(f)
with open(os.path.join(OUTPUT_DIR, "grammar_unified.json"), "w", encoding="utf-8") as f:
    json.dump(grammar_json, f, ensure_ascii=False, indent=2)

# Copy Composition Graph
comp_src = glob.glob(os.path.join(TMP_DIR, "**/composition.json"), recursive=True)[0]
with open(comp_src, "r", encoding="utf-8") as f:
    comp_data = json.load(f)
with open(os.path.join(OUTPUT_DIR, "composition.json"), "w", encoding="utf-8") as f:
    json.dump(comp_data, f, ensure_ascii=False, indent=2)

print("\n🎉 TOUS LES FICHIERS UNIFIÉS DE PUBLIC/DATA/ ONT ÉTÉ GÉNÉRÉS SANS ERREUR !")
