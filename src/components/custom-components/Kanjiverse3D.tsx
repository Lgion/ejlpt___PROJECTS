'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { localDb } from '@/lib/db';
import { Orbit, Search, ExternalLink } from 'lucide-react';

interface CompositionEntry {
  in?: string[];
  out?: string[];
}

interface KanjiverseNodeInfo {
  kanji: string;
  jlpt: string;
  category: string;
  meaning: string;
  strokes: number | null;
  role: 'center' | 'component' | 'derived';
}

const JLPT_HEX_COLORS: Record<string, number> = {
  N5: 0x38bdf8,
  N4: 0x34d399,
  N3: 0xfbbf24,
  N2: 0xfb923c,
  N1: 0xf43f5e,
  N0: 0x94a3b8,
};

function createKanjiSpriteTexture(char: string, ringColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(64, 64, 56, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 58px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(char, 64, 68);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function Kanjiverse3D({ initialKanji = '語' }: { initialKanji?: string }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [focusKanji, setFocusKanji] = useState(initialKanji);
  const [queryInput, setQueryInput] = useState(initialKanji);
  const [selectedNode, setSelectedNode] = useState<KanjiverseNodeInfo | null>(null);
  const [graphNodes, setGraphNodes] = useState<KanjiverseNodeInfo[]>([]);
  const [webglError, setWebglError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let animationId = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;

    const buildConstellation = async () => {
      const container = mountRef.current;
      if (!container) return;

      const res = await fetch('/data/composition.json');
      if (!res.ok) return;
      const compMap = (await res.json()) as Record<string, CompositionEntry>;
      if (!active) return;

      const centerEntry = compMap[focusKanji] || {};
      const parentChars = (centerEntry.in || []).slice(0, 14);
      const childChars = (centerEntry.out || []).slice(0, 28);

      // Expand 2nd-hop neighbors capped to ~65 total nodes for clear readability
      const secondHop = new Set<string>();
      for (const p of parentChars.slice(0, 4)) {
        for (const sib of (compMap[p]?.out || []).slice(0, 8)) {
          if (sib !== focusKanji && !childChars.includes(sib) && !parentChars.includes(sib)) {
            secondHop.add(sib);
          }
          if (secondHop.size >= 20) break;
        }
        if (secondHop.size >= 20) break;
      }

      const uniqueChars = Array.from(
        new Set([focusKanji, ...parentChars, ...childChars, ...Array.from(secondHop)])
      );

      const dbRecords = await localDb.kanjis.where('kanji').anyOf(uniqueChars).toArray();
      const recordMap = new Map(dbRecords.map((k) => [k.kanji, k]));
      if (!active) return;

      const nodesMeta: KanjiverseNodeInfo[] = uniqueChars.map((ch) => {
        const rec = recordMap.get(ch);
        const fr = rec?.meanings_fr?.filter((m) => m && m !== '-') || [];
        const en = rec?.meanings_en?.filter((m) => m && m !== '-') || [];
        const role: KanjiverseNodeInfo['role'] =
          ch === focusKanji ? 'center' : parentChars.includes(ch) ? 'component' : 'derived';
        return {
          kanji: ch,
          jlpt: rec?.jlpt || 'N0',
          category: rec?.category || 'composant',
          meaning: (fr.length > 0 ? fr : en).slice(0, 3).join(', ') || 'Composant / Kanji',
          strokes: rec?.strokes ?? null,
          role,
        };
      });

      setGraphNodes(nodesMeta);
      setSelectedNode(nodesMeta[0] || null);

      // Initialize Three.js WebGL scene
      try {
        const width = container.clientWidth || 720;
        const height = container.clientHeight || 460;

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(width, height);
        container.innerHTML = '';
        container.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x020617);

        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        camera.position.set(0, 4, 24);

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.06;

        // Ambient starfield particles
        const starPositions = new Float32Array(300 * 3);
        for (let i = 0; i < 300; i += 1) {
          starPositions[i * 3] = (Math.random() - 0.5) * 90;
          starPositions[i * 3 + 1] = (Math.random() - 0.5) * 90;
          starPositions[i * 3 + 2] = (Math.random() - 0.5) * 90;
        }
        const starGeo = new THREE.BufferGeometry();
        starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        scene.add(
          new THREE.Points(
            starGeo,
            new THREE.PointsMaterial({ color: 0x475569, size: 0.25 })
          )
        );

        const positions = new Map<string, THREE.Vector3>();
        const clickableSprites: THREE.Sprite[] = [];

        const placeRing = (chars: string[], radius: number, yOffset: number) => {
          chars.forEach((ch, idx) => {
            const angle = (idx / Math.max(1, chars.length)) * Math.PI * 2;
            const zJitter = ((idx % 3) - 1) * 2.2;
            positions.set(
              ch,
              new THREE.Vector3(Math.cos(angle) * radius, yOffset + Math.sin(angle * 2) * 1.6, Math.sin(angle) * radius + zJitter)
            );
          });
        };

        positions.set(focusKanji, new THREE.Vector3(0, 0, 0));
        placeRing(parentChars, 6.5, 4.2);
        placeRing(childChars, 9.5, -2.5);
        placeRing(Array.from(secondHop), 14.5, 1.5);

        const metaMap = new Map(nodesMeta.map((n) => [n.kanji, n]));

        // Edges
        const edgeMat = new THREE.LineBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.35,
        });
        const centerPos = positions.get(focusKanji)!;
        for (const ch of [...parentChars, ...childChars]) {
          const p = positions.get(ch);
          if (!p) continue;
          const lineGeo = new THREE.BufferGeometry().setFromPoints([centerPos, p]);
          scene.add(new THREE.Line(lineGeo, edgeMat));
        }

        // Kanji sprites
        for (const [ch, pos] of positions.entries()) {
          const meta = metaMap.get(ch);
          const hex = JLPT_HEX_COLORS[meta?.jlpt || 'N0'] || 0x94a3b8;
          const cssHex = `#${hex.toString(16).padStart(6, '0')}`;
          const tex = createKanjiSpriteTexture(ch, ch === focusKanji ? '#facc15' : cssHex);
          const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
          const sprite = new THREE.Sprite(mat);
          sprite.position.copy(pos);
          const scale = ch === focusKanji ? 3.2 : meta?.role === 'component' ? 2.1 : 1.75;
          sprite.scale.set(scale, scale, 1);
          sprite.userData = { nodeInfo: meta };
          scene.add(sprite);
          clickableSprites.push(sprite);
        }

        // Raycaster click selection
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        const handleClick = (ev: MouseEvent) => {
          if (!renderer) return;
          const rect = renderer.domElement.getBoundingClientRect();
          pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);
          const hits = raycaster.intersectObjects(clickableSprites);
          if (hits.length > 0) {
            const info = hits[0].object.userData?.nodeInfo as KanjiverseNodeInfo | undefined;
            if (info) setSelectedNode(info);
          }
        };
        renderer.domElement.addEventListener('click', handleClick);

        const handleResize = () => {
          if (!container || !renderer) return;
          const w = container.clientWidth || 720;
          const h = container.clientHeight || 460;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        const animate = () => {
          if (!active || !renderer || !controls) return;
          animationId = requestAnimationFrame(animate);
          scene.rotation.y += 0.0012;
          controls.update();
          renderer.render(scene, camera);
        };
        animate();

        return () => {
          window.removeEventListener('resize', handleResize);
          renderer?.domElement.removeEventListener('click', handleClick);
        };
      } catch {
        setWebglError('WebGL indisponible dans ce navigateur — utilisez la grille relationnelle ci-dessous.');
      }
      return undefined;
    };

    void buildConstellation();

    return () => {
      active = false;
      if (animationId) cancelAnimationFrame(animationId);
      controls?.dispose();
      renderer?.dispose();
    };
  }, [focusKanji]);

  const handleFocusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ch = Array.from(queryInput.trim())[0];
    if (ch) setFocusKanji(ch);
  };

  return (
    <div className="kanjiverse">
      <div className="kanjiverse__toolbar">
        <div>
          <h2 className="kanjiverse__title">
            <Orbit className="kanjiverse__title-icon" />
            Constellation 3D Kanjiverse — Pivot « {focusKanji} »
          </h2>
          <p className="kanjiverse__subtitle">
            Glissez pour orbiter, molette pour zoomer, cliquez sur une étoile-kanji ou recentrez la
            constellation.
          </p>
        </div>

        <form onSubmit={handleFocusSubmit} className="kanjiverse__form">
          <label htmlFor="kanjiverse-focus-input" className="sr-only-label">
            Kanji pivot Kanjiverse
          </label>
          <div className="kanjiverse__input-wrap">
            <Search className="kanjiverse__search-icon" />
            <input
              id="kanjiverse-focus-input"
              type="text"
              maxLength={4}
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Kanji (ex: 語)"
              className="kanjiverse__input"
            />
          </div>
          <button type="submit" className="kanjiverse__submit-btn">
            Explorer
          </button>
        </form>
      </div>

      <div className="kanjiverse__grid">
        <div className="kanjiverse__viewport-wrap">
          {webglError ? (
            <div className="kanjiverse__error">{webglError}</div>
          ) : (
            <div ref={mountRef} className="kanjiverse__mount" />
          )}
        </div>

        <div className="kanjiverse__sidebar">
          {selectedNode ? (
            <div className="kanjiverse__node-card">
              <div className="kanjiverse__node-head">
                <span className="kanjiverse__node-glyph">{selectedNode.kanji}</span>
                <span className="kanjiverse__node-meta">
                  {selectedNode.jlpt} • {selectedNode.strokes ?? '?'} traits
                </span>
              </div>
              <div className="kanjiverse__node-role">
                Rôle :{' '}
                {selectedNode.role === 'center'
                  ? 'Pivot central'
                  : selectedNode.role === 'component'
                    ? 'Composant / Radical parent'
                    : 'Kanji dérivé'}
              </div>
              <div className="kanjiverse__node-meaning">{selectedNode.meaning}</div>
              <div className="kanjiverse__node-actions">
                <button
                  type="button"
                  onClick={() => {
                    setFocusKanji(selectedNode.kanji);
                    setQueryInput(selectedNode.kanji);
                  }}
                  className="kanjiverse__recenter-btn"
                >
                  Recentrer sur {selectedNode.kanji}
                </button>
                <Link
                  href={`/kanji?q=${encodeURIComponent(selectedNode.kanji)}`}
                  className="kanjiverse__link-btn"
                >
                  <ExternalLink className="kanjiverse__link-icon" /> Fiche
                </Link>
              </div>
            </div>
          ) : (
            <div className="kanjiverse__loading">Chargement de la constellation...</div>
          )}

          <div>
            <div className="kanjiverse__nodes-label">
              Nœuds connectés ({graphNodes.length})
            </div>
            <div className="kanjiverse__nodes-list">
              {graphNodes.map((n) => (
                <button
                  key={n.kanji}
                  type="button"
                  onClick={() => setSelectedNode(n)}
                  className={`kanjiverse__node-chip ${
                    selectedNode?.kanji === n.kanji ? 'kanjiverse__node-chip--active' : ''
                  }`}
                >
                  {n.kanji}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

