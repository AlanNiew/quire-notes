import { useRef, type ReactNode } from 'react';
import type { Note } from '../types';

export type ViewMode = 'edit' | 'split' | 'preview';

interface EditorProps {
  note: Note;
  viewMode: ViewMode;
  onViewMode: (mode: ViewMode) => void;
  onChange: (patch: Partial<Pick<Note, 'title' | 'content'>>) => void;
  status: string;
  /** 预览面板由 App 传入，Editor 只负责布局 */
  preview: ReactNode;
}

const MODES: { mode: ViewMode; label: string }[] = [
  { mode: 'edit', label: '编辑' },
  { mode: 'split', label: '分屏' },
  { mode: 'preview', label: '预览' },
];

export default function Editor({
  note,
  viewMode,
  onViewMode,
  onChange,
  status,
  preview,
}: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /** 用成对符号包裹选区（加粗、斜体、代码…） */
  const surround = (before: string, after = before) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const selected = value.slice(s, e) || '文本';
    const next = value.slice(0, s) + before + selected + after + value.slice(e);
    onChange({ content: next });
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + before.length, s + before.length + selected.length);
    });
  };

  /** 给当前行加前缀（标题、列表、引用） */
  const prefixLine = (prefix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s, value } = ta;
    const lineStart = value.lastIndexOf('\n', s - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange({ content: next });
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + prefix.length, s + prefix.length);
    });
  };

  const tools = [
    { label: 'B', title: '加粗 **', run: () => surround('**') },
    { label: 'I', title: '斜体 *', run: () => surround('*') },
    { label: 'H1', title: '一级标题', run: () => prefixLine('# ') },
    { label: 'H2', title: '二级标题', run: () => prefixLine('## ') },
    { label: '•', title: '无序列表', run: () => prefixLine('- ') },
    { label: '❝', title: '引用', run: () => prefixLine('> ') },
    { label: '</>', title: '行内代码', run: () => surround('`') },
    { label: '~~', title: '删除线', run: () => surround('~~') },
    { label: '🔗', title: '链接', run: () => surround('[', '](https://)') },
  ];

  return (
    <div className="editor">
      <input
        className="title-input"
        value={note.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="输入标题…"
        spellCheck={false}
      />

      <div className="toolbar">
        <div className="md-tools">
          {viewMode !== 'preview' &&
            tools.map((t) => (
              <button
                key={t.title}
                className="md-btn"
                title={t.title}
                onMouseDown={(e) => e.preventDefault()} // 防止按钮抢走文本框焦点
                onClick={t.run}
              >
                {t.label}
              </button>
            ))}
        </div>
        <div className="toolbar-right">
          <span className="save-status">{status}</span>
          <div className="segmented">
            {MODES.map((m) => (
              <button
                key={m.mode}
                className={m.mode === viewMode ? 'active' : ''}
                onClick={() => onViewMode(m.mode)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="workspace" data-mode={viewMode}>
        {viewMode !== 'preview' && (
          <textarea
            ref={textareaRef}
            className="editor-text"
            value={note.content}
            onChange={(e) => onChange({ content: e.target.value })}
            placeholder="在这里用 Markdown 写作…"
            spellCheck={false}
          />
        )}
        {viewMode !== 'edit' && <section className="preview-pane">{preview}</section>}
      </div>
    </div>
  );
}
