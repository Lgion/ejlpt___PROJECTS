'use client';

import React, { useEffect, useState } from 'react';
import { Network, Loader2 } from 'lucide-react';
import { localDb, UnifiedKanjiRecord } from '@/lib/db';

interface RadicalNode {
  kanji: string;
  meaning: string;
  reading: string;
  components?: RadicalNode[];
}

interface CompositionGraph {
  [kanji: string]: {
    in?: string[]; // sub-components
    out?: string[]; // kanjis that use this as a component
  };
}

interface CascadingKanjiTreeProps {
  targetKanji?: string;
}

export const CascadingKanjiTree: React.FC<CascadingKanjiTreeProps> = ({ targetKanji = '語' }) => {
  const [compositionData, setCompositionData] = useState<CompositionGraph | null>(null);
  const [treeNode, setTreeNode] = useState<RadicalNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<RadicalNode | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // 1. Fetch composition graph once
  useEffect(() => {
    fetch('/data/composition.json')
      .then((res) => res.json())
      .then((data: CompositionGraph) => {
        setCompositionData(data);
      })
      .catch((err) => console.error('[CascadingKanjiTree] Failed to load composition graph:', err));
  }, []);

  // 2. Build tree dynamically when targetKanji or compositionData changes
  useEffect(() => {
    if (!compositionData) return;

    let isMounted = true;
    setLoading(true);

    async function buildTree(kanjiChar: string, depth = 0, maxDepth = 2): Promise<RadicalNode> {
      // Query IndexedDB for detailed metadata
      const record = await localDb.kanjis.get(kanjiChar);

      const meaning = record?.meanings_fr?.[0] || record?.meanings_en?.[0] || record?.rtk_keyword_6th || 'Composant / Radical';
      const reading = record?.on_readings?.[0] || record?.kun_readings?.[0] || record?.radical_name_en || '';

      const node: RadicalNode = {
        kanji: kanjiChar,
        meaning,
        reading,
        components: [],
      };

      if (depth < maxDepth && compositionData) {
        const directChildren = compositionData[kanjiChar]?.in || [];
        if (directChildren.length > 0) {
          node.components = await Promise.all(
            directChildren.map((childKanji) => buildTree(childKanji, depth + 1, maxDepth))
          );
        }
      }

      return node;
    }

    buildTree(targetKanji).then((rootNode) => {
      if (isMounted) {
        setTreeNode(rootNode);
        setSelectedNode(rootNode);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [targetKanji, compositionData]);

  const renderNode = (node: RadicalNode, level = 0) => (
    <div key={`${node.kanji}-${level}`} className="flex flex-col items-center">
      <button
        onClick={() => setSelectedNode(node)}
        className={`flex flex-col items-center p-3 rounded-xl border transition-all shadow-md ${
          selectedNode?.kanji === node.kanji
            ? 'bg-sky-950 border-sky-500 text-sky-200 ring-2 ring-sky-500/40 shadow-sky-900/50 scale-105'
            : 'bg-slate-800 border-slate-700 text-slate-200 hover:border-slate-500'
        }`}
      >
        <span className="text-2xl font-bold font-serif">{node.kanji}</span>
        {node.reading && <span className="text-[10px] text-sky-400 font-semibold mt-1">{node.reading}</span>}
        <span className="text-[11px] text-slate-400 max-w-[110px] text-center truncate mt-0.5">{node.meaning}</span>
      </button>

      {node.components && node.components.length > 0 && (
        <div className="flex flex-col items-center mt-2 w-full">
          <div className="w-0.5 h-4 bg-slate-700"></div>
          <div className="flex items-start justify-center gap-4 border-t border-slate-700 pt-2 w-full">
            {node.components.map((child) => renderNode(child, level + 1))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-xl flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
          <Network className="w-4 h-4" />
          Arbre de Filiation & Décomposition Dynamique (KanjiTree)
        </span>
        <span className="text-xs text-slate-400">Graphe des Composants (`composition.json`)</span>
      </div>

      <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto flex justify-center py-6 min-h-[160px] items-center">
        {loading ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-sky-500" />
            <span>Génération de l&apos;arbre de décomposition...</span>
          </div>
        ) : treeNode ? (
          renderNode(treeNode)
        ) : (
          <span className="text-xs text-slate-500">Aucune donnée de composition pour {targetKanji}</span>
        )}
      </div>

      {selectedNode && (
        <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-lg flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-950 border border-sky-600 text-sky-300 flex items-center justify-center text-xl font-bold font-serif shrink-0">
            {selectedNode.kanji}
          </div>
          <div className="flex-1 text-xs">
            <div className="font-bold text-slate-200">{selectedNode.meaning}</div>
            {selectedNode.reading && <div className="text-slate-400">Lecture : {selectedNode.reading}</div>}
          </div>
        </div>
      )}
    </div>
  );
};
