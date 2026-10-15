import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import Editor, { type ViewMode } from './components/Editor';
import Preview from './components/Preview';
import { api } from './api';
import type { Note, NoteMeta } from './types';
import { applyThemeMode, readThemeMode, storeThemeMode, type ThemeMode } from './theme';

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved';

/** 内容指纹：和上次保存的内容比对，判断是否需要真的发保存请求 */
const fingerprintOf = (note: { title: string; content: string }) =>
  `${note.title}\u0000${note.content}`;

export default function App() {
  const [notes, setNotes] = useState<NoteMeta[]>([]);
  const [active, setActive] = useState<Note | null>(null);
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readThemeMode());

  const fingerprintRef = useRef('');
  const timerRef = useRef<number | null>(null);

  /** 打开一篇笔记：从 Rust 拿完整正文 */
  const selectNote = useCallback(async (id: number) => {
    const note = await api.getNote(id);
    fingerprintRef.current = fingerprintOf(note);
    setActive(note);
    setSaveState('idle');
  }, []);

  /** 新建：乐观更新，先让 UI 立刻出现，落库结果再回来 */
  const createNote = useCallback(async () => {
    const note = await api.createNote();
    setNotes((prev) => [note, ...prev]);
    fingerprintRef.current = fingerprintOf(note);
    setActive(note);
    setSaveState('idle');
  }, []);

  /** 保存当前笔记（被防抖定时器和 Ctrl+S 调用） */
  const saveNote = useCallback(async (note: Note) => {
    setSaveState('saving');
    try {
      const updated = await api.updateNote(note.id, note.title, note.content);
      fingerprintRef.current = fingerprintOf(updated);
      setActive(updated); // 拿到服务端刷新后的 updated_at
      setNotes((prev) =>
        prev.map((n) =>
          n.id === updated.id
            ? {
                id: updated.id,
                title: updated.title,
                created_at: updated.created_at,
                updated_at: updated.updated_at,
              }
            : n
        )
      );
      setSavedAt(updated.updated_at);
      setSaveState('saved');
    } catch (err) {
      console.error('保存失败：', err);
      setSaveState('dirty');
    }
  }, []);

  // 初次挂载：读取列表，自动打开第一篇
  useEffect(() => {
    api
      .listNotes()
      .then((list) => {
        setNotes(list);
        if (list.length > 0) void selectNote(list[0].id);
      })
      .catch(console.error);
  }, [selectNote]);

  // 内容变化 → 先标记 dirty，600ms 没有新变化就自动保存
  useEffect(() => {
    if (!active) return;
    // 刚加载/刚保存的内容不用再存
    if (fingerprintOf(active) === fingerprintRef.current) return;
    setSaveState('dirty');
    timerRef.current = window.setTimeout(() => void saveNote(active), 600);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.title, active?.content]);

  // 快捷键：Ctrl+S 立即保存，Ctrl+N 新建
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === 's') {
        e.preventDefault();
        if (active && fingerprintOf(active) !== fingerprintRef.current) {
          void saveNote(active);
        }
      } else if (key === 'n') {
        e.preventDefault();
        void createNote();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, saveNote, createNote]);

  // 主题：写进 <html data-theme>；选“跟随系统”时监听系统主题变化
  useEffect(() => {
    applyThemeMode(themeMode);
    storeThemeMode(themeMode);
    if (themeMode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyThemeMode('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [themeMode]);

  const deleteNote = async (id: number) => {
    await api.deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (active?.id === id) {
      setActive(null);
      fingerprintRef.current = '';
      setSaveState('idle');
    }
  };

  /** 局部更新当前笔记（标题输入、正文输入都走这里） */
  const patchActive = (patch: Partial<Pick<Note, 'title' | 'content'>>) => {
    setActive((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  // 按标题过滤（客户端过滤，数据都在内存里）
  const visibleNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? notes.filter((n) => n.title.toLowerCase().includes(q)) : notes;
  }, [notes, query]);

  const statusText =
    saveState === 'saving'
      ? '保存中…'
      : saveState === 'dirty'
        ? '未保存…'
        : saveState === 'saved' && savedAt !== null
          ? `已保存 ${new Date(savedAt).toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}`
          : '';

  return (
    <div className="app">
      <TitleBar themeMode={themeMode} onThemeMode={setThemeMode} />
      <div className="app-body">
        <Sidebar
          notes={visibleNotes}
          activeId={active?.id ?? null}
          query={query}
          onQuery={setQuery}
          onSelect={(id) => void selectNote(id)}
          onCreate={() => void createNote()}
          onDelete={(id) => void deleteNote(id)}
        />
        <main className="main">
          {active ? (
            <Editor
              note={active}
              viewMode={viewMode}
              onViewMode={setViewMode}
              onChange={patchActive}
              status={statusText}
              preview={<Preview content={active.content} />}
            />
          ) : (
            <div className="empty-state">
              <div className="big">📝</div>
              <div>{notes.length === 0 ? '还没有笔记' : '从左侧选择一篇笔记'}</div>
              <button className="btn-primary" onClick={() => void createNote()}>
                ＋ 新建第一篇
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
