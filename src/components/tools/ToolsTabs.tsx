import React from 'react';
import {
  PenTool,
  Layers,
  Network,
  Orbit,
  Volume2,
  Table2,
  ShieldCheck,
  Link2,
  ListTodo,
} from 'lucide-react';

export type ToolsTabId =
  | 'canvas'
  | 'ezoe'
  | 'tree'
  | 'kanjiverse'
  | 'audio'
  | 'conjugation'
  | 'politeness'
  | 'links'
  | 'ai_todo';

interface ToolsTabsProps {
  activeTab: ToolsTabId;
  onTabChange: (tab: ToolsTabId) => void;
}

const TOOL_TABS: Array<{
  id: ToolsTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'canvas', label: 'Canvas Écriture (IME)', icon: PenTool },
  { id: 'conjugation', label: 'Table Conjugaison', icon: Table2 },
  { id: 'politeness', label: 'Récap Politesse / Keigo', icon: ShieldCheck },
  { id: 'links', label: 'おすすめのリンクス', icon: Link2 },
  { id: 'ai_todo', label: 'Todo-List IA', icon: ListTodo },
  { id: 'ezoe', label: 'Grammaire Méthode Ezoe', icon: Layers },
  { id: 'tree', label: 'Arbre de Kanji (Radicaux)', icon: Network },
  { id: 'kanjiverse', label: 'Kanjiverse 3D', icon: Orbit },
  { id: 'audio', label: 'Lecteur Choukai Audio', icon: Volume2 },
];

export function ToolsTabs({ activeTab, onTabChange }: ToolsTabsProps) {
  return (
    <div className="tools-page__tabs">
      {TOOL_TABS.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onTabChange(t.id)}
            className={`tools-page__tab ${
              activeTab === t.id ? 'tools-page__tab--active' : ''
            }`}
          >
            <Icon className="tools-page__tab-icon" /> {t.label}
          </button>
        );
      })}
    </div>
  );
}
