import { invoke } from '@tauri-apps/api/core';
import type { Note, NoteMeta } from './types';

/**
 * 前端与 Rust 后端之间的唯一桥梁。
 *
 * invoke('命令名', 参数对象) 的工作方式：
 *   1. 参数序列化成 JSON
 *   2. 穿过 WebView → Rust 的 IPC 通道（进程间通信）
 *   3. 调用 Rust 里用 #[tauri::command] 标注的同名函数
 *   4. 返回值（也是 JSON）反序列化回 Promise<T>
 */
export const api = {
  listNotes: () => invoke<NoteMeta[]>('list_notes'),
  getNote: (id: number) => invoke<Note>('get_note', { id }),
  createNote: () => invoke<Note>('create_note'),
  updateNote: (id: number, title: string, content: string) =>
    invoke<Note>('update_note', { id, title, content }),
  deleteNote: (id: number) => invoke<void>('delete_note', { id }),
};
