import { useState } from 'react';
import type { NoteMeta } from '../types';

interface SidebarProps {
  notes: NoteMeta[];
  activeId: number | null;
  query: string;
  onQuery: (v: string) => void;
  onSelect: (id: number) => void;
  onCreate: () => void;
  onDelete: (id: number) => void;
}

/** 今天显示时分，更早的显示月/日 */
function formatTime(ms: number) {
  const d = new Date(ms);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

export default function Sidebar({
  notes,
  activeId,
  query,
  onQuery,
  onSelect,
  onCreate,
  onDelete,
}: SidebarProps) {
  // 待确认删除的笔记 id：点一次 × 变成“确认删除？”，再点才真正删
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <span className="brand">📝 Markdown Notes</span>
        <button className="btn-primary" onClick={onCreate}>
          ＋ 新建
        </button>
      </div>

      <input
        className="search"
        placeholder="搜索标题…"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
      />

      <ul className="note-list">
        {notes.map((note) => (
          <li
            key={note.id}
            className={`note-item${note.id === activeId ? ' active' : ''}`}
            onClick={() => {
              setPendingDeleteId(null);
              onSelect(note.id);
            }}
          >
            <div className="note-title">{note.title || '（无标题）'}</div>
            <div className="note-meta">
              <span>{formatTime(note.updated_at)}</span>
              {pendingDeleteId === note.id ? (
                <span
                  className="del-confirm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingDeleteId(null);
                    onDelete(note.id);
                  }}
                >
                  确认删除？
                </span>
              ) : (
                <button
                  className="del-btn"
                  title="删除这篇笔记"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingDeleteId(note.id);
                  }}
                >
                  ×
                </button>
              )}
            </div>
          </li>
        ))}
        {notes.length === 0 && <li className="list-empty">没有匹配的笔记</li>}
      </ul>

      <footer className="sidebar-foot">Ctrl+N 新建 · Ctrl+S 保存</footer>
    </aside>
  );
}
