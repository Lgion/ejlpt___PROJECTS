'use client';

import React, { useEffect, useState } from 'react';
import { Network, Loader2 } from 'lucide-react';
import { localDb } from '@/lib/db';

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
  embeddedInModal?: boolean;
}

export const CascadingKanjiTree: React.FC<CascadingKanjiTreeProps> = ({
  targetKanji = '語',
  embeddedInModal = false,
}) => {
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
    queueMicrotask(() => {
      if (isMounted) setLoading(true);
    });

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
    <div key={`${node.kanji}-${level}`} className="kanji-tree__node-wrap">
      <button
        type="button"
        onClick={() => setSelectedNode(node)}
        className={`kanji-tree__node-btn ${selectedNode?.kanji === node.kanji ? 'kanji-tree__node-btn--active' : ''
          }`}
      >
        <span className="kanji-tree__node-glyph">{node.kanji}</span>
        {node.reading && <span className="kanji-tree__node-reading">{node.reading}</span>}
        <span className="kanji-tree__node-meaning">{node.meaning}</span>
      </button>

      {node.components && node.components.length > 0 && (
        <div className="kanji-tree__children-wrap">
          <div className="kanji-tree__stem" />
          <div className="kanji-tree__children-row">
            {node.components.map((child) => renderNode(child, level + 1))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={`kanji-tree ${embeddedInModal ? 'kanji-tree--modal' : ''}`}>
      {!embeddedInModal && (
        <div className="kanji-tree__head">
          <span className="kanji-tree__title">
            <Network className="kanji-tree__title-icon" />
            Arbre de Filiation &amp; Décomposition Dynamique (KanjiTree)
          </span>
          <span className="kanji-tree__source">Graphe des Composants (`composition.json`)</span>
        </div>
      )}

      <div className="kanji-tree__canvas">
        {loading ? (
          <div className="kanji-tree__loading">
            <Loader2 className="kanji-tree__spinner" />
            <span>Génération de l&apos;arbre de décomposition...</span>
          </div>
        ) : treeNode ? (
          renderNode(treeNode)
        ) : (
          <span className="kanji-tree__empty">
            Aucune donnée de composition pour {targetKanji}
          </span>
        )}
      </div>

      {selectedNode && (
        <div className="kanji-tree__inspector">
          <div className="kanji-tree__inspector-glyph">{selectedNode.kanji}</div>
          <div className="kanji-tree__inspector-info">
            <div className="kanji-tree__inspector-meaning">{selectedNode.meaning}</div>
            {selectedNode.reading && (
              <div className="kanji-tree__inspector-reading">
                Lecture : {selectedNode.reading}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
