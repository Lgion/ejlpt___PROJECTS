from __future__ import annotations

import json
import os
import tempfile
import unittest

from PIL import Image

from scripts.build_sprites_pipeline import (
    classify_item_complexity,
    process_item_media,
)
from scripts.compile_sprites_webp import compile_sprite_sheets
from scripts.enrich_open_data import (
    build_sense_probabilities,
    classify_script,
    compute_jukugo_freq_score_10,
    compute_kanji_freq_score_10,
)


class TestDataAndSpritePipelines(unittest.TestCase):
    def test_classify_item_complexity_simple_vs_complex(self) -> None:
        cat_item = {
            'itemKey': 'kanji:猫',
            'kind': 'kanji',
            'kanji': '猫',
            'category': 'animauxEtNature',
            'meanings_en': ['cat'],
        }
        red_item = {
            'itemKey': 'kanji:赤',
            'kind': 'kanji',
            'kanji': '赤',
            'category': 'couleurs',
            'meanings_en': ['red'],
        }
        tachi_item = {
            'itemKey': 'kanji:達',
            'kind': 'kanji',
            'kanji': '達',
            'category': 'abstrait',
            'meanings_en': ['accomplished', 'plural suffix -tachi'],
        }
        grammar_item = {
            'itemKey': 'grammar:とは',
            'kind': 'grammar',
            'term': 'とは',
        }

        self.assertEqual(classify_item_complexity(cat_item), 'simple')
        self.assertEqual(classify_item_complexity(red_item), 'simple')
        self.assertEqual(classify_item_complexity(tachi_item), 'complex')
        self.assertEqual(classify_item_complexity(grammar_item), 'complex')

    def test_simple_item_uses_cdn_without_ai_and_complex_item_queues_prompt_on_reject(self) -> None:
        ai_calls = []
        queue = []

        def fake_cdn(query: str):
            return [{'url': f'https://cdn.example/{query}.jpg', 'description': query, 'source': 'unsplash'}]

        def fake_ai(item, candidates):
            ai_calls.append(item['itemKey'])
            label = item.get('term') or item.get('kanji') or ''
            return {
                'selectedIndex': -1,
                'generationPrompt': f'Illustration representing plural suffix {label}',
            }

        def fake_dl(url: str, dest: str) -> bool:
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with open(dest, 'wb') as f:
                f.write(b'fake-img-bytes')
            return True

        with tempfile.TemporaryDirectory() as tmpdir:
            res_simple = process_item_media(
                {'itemKey': 'kanji:猫', 'kind': 'kanji', 'kanji': '猫', 'category': 'animauxEtNature', 'query': 'cat'},
                cdn_search_fn=fake_cdn,
                ai_judge_fn=fake_ai,
                download_fn=fake_dl,
                queue=queue,
                thumb_dir=tmpdir,
            )
            self.assertEqual(res_simple, 'cdn_simple')
            self.assertEqual(ai_calls, [])
            self.assertEqual(queue, [])

            res_complex = process_item_media(
                {'itemKey': 'kanji:達', 'kind': 'kanji', 'kanji': '達', 'category': 'abstrait', 'query': 'plural suffix'},
                cdn_search_fn=fake_cdn,
                ai_judge_fn=fake_ai,
                download_fn=fake_dl,
                queue=queue,
                thumb_dir=tmpdir,
            )
            self.assertEqual(res_complex, 'queued_ai_prompt')
            self.assertEqual(ai_calls, ['kanji:達'])
            self.assertEqual(len(queue), 1)
            self.assertEqual(queue[0]['status'], 'pending')
            self.assertIn('plural suffix', queue[0]['generationPrompt'])

    def test_compile_sprites_webp_generates_sheet_and_manifest(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            thumb_dir = os.path.join(tmpdir, 'thumbs', 'kanji')
            out_dir = os.path.join(tmpdir, 'sprites')
            os.makedirs(thumb_dir, exist_ok=True)

            # Base64 urlsafe for kanji:猫 -> a2Fuamk654yr
            import base64
            key_b64 = base64.urlsafe_b64encode('kanji:猫'.encode('utf-8')).decode('ascii').rstrip('=')
            img_path = os.path.join(thumb_dir, f'{key_b64}.png')
            Image.new('RGB', (200, 150), (30, 144, 255)).save(img_path)

            manifest = compile_sprite_sheets(
                thumb_dir=os.path.join(tmpdir, 'thumbs'),
                output_dir=out_dir,
                cell_size=64,
                cols=4,
                rows=4,
            )

            self.assertIn('kanji-0', manifest['sheets'])
            self.assertTrue(os.path.exists(os.path.join(out_dir, 'kanji-0.webp')))
            self.assertTrue(os.path.exists(os.path.join(out_dir, 'manifest.json')))
            self.assertEqual(manifest['items']['kanji:猫'][0]['index'], 0)

    def test_open_data_helpers(self) -> None:
        self.assertEqual(classify_script('ひらがな'), 'hira_only')
        self.assertEqual(classify_script('カタカナ'), 'kata_only')
        self.assertEqual(classify_script('あいうアイウ'), 'mixed_hira_kata')
        self.assertEqual(classify_script('日本語'), 'mixed_kanji')
        self.assertEqual(classify_script('AI臭い'), 'mixed_romaji')

        self.assertEqual(compute_kanji_freq_score_10({'news': 50}), 10)
        self.assertEqual(compute_kanji_freq_score_10({'news': 12000}), 1)
        self.assertEqual(compute_jukugo_freq_score_10(300000), 10)
        self.assertEqual(compute_jukugo_freq_score_10(10), 1)

        probs = build_sense_probabilities(['sens A', 'sens B', 'sens C'])
        self.assertEqual(sum(p['percent'] for p in probs), 100)


if __name__ == '__main__':
    unittest.main()
