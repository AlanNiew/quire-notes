/** 笔记列表项：只有标题和时间，不带正文（列表能少传输大量数据） */
export interface NoteMeta {
  id: number;
  title: string;
  created_at: number;
  updated_at: number;
}

/** 完整笔记：打开某一篇编辑时用 */
export interface Note extends NoteMeta {
  content: string;
}
