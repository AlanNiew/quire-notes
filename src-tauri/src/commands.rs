use rusqlite::Row;
use serde::Serialize;
use tauri::State;

use crate::db::AppState;

/// 列表项：不含正文（笔记多了以后，列表能省大量数据传输）
#[derive(Debug, Serialize, Clone)]
pub struct NoteMeta {
    pub id: i64,
    pub title: String,
    pub created_at: i64,
    pub updated_at: i64,
}

/// 完整笔记：打开某一篇编辑时用
#[derive(Debug, Serialize, Clone)]
pub struct Note {
    pub id: i64,
    pub title: String,
    pub content: String,
    pub created_at: i64,
    pub updated_at: i64,
}

impl Note {
    fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            title: row.get(1)?,
            content: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    }
}

impl NoteMeta {
    fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            title: row.get(1)?,
            created_at: row.get(2)?,
            updated_at: row.get(3)?,
        })
    }
}

const SELECT_META: &str = "SELECT id, title, created_at, updated_at FROM notes";
const SELECT_FULL: &str = "SELECT id, title, content, created_at, updated_at FROM notes";

fn db_err(e: rusqlite::Error) -> String {
    format!("数据库错误: {e}")
}

/// 全部笔记（按最近更新排序，最新在前）
#[tauri::command]
pub fn list_notes(state: State<'_, AppState>) -> Result<Vec<NoteMeta>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(&format!("{SELECT_META} ORDER BY updated_at DESC, id DESC"))
        .map_err(db_err)?;
    let rows = stmt
        .query_map(rusqlite::params![], NoteMeta::from_row)
        .map_err(db_err)?;
    rows.collect::<rusqlite::Result<Vec<_>>>().map_err(db_err)
}

/// 单篇完整内容
#[tauri::command]
pub fn get_note(state: State<'_, AppState>, id: i64) -> Result<Note, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        &format!("{SELECT_FULL} WHERE id = ?1"),
        rusqlite::params![id],
        Note::from_row,
    )
    .map_err(db_err)
}

/// 新建：返回插入后的完整记录（RETURNING 是 SQLite 3.35+ 的能力）
#[tauri::command]
pub fn create_note(state: State<'_, AppState>) -> Result<Note, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "INSERT INTO notes (title, content) VALUES ('未命名笔记', '')
         RETURNING id, title, content, created_at, updated_at",
        rusqlite::params![],
        Note::from_row,
    )
    .map_err(db_err)
}

/// 更新：顺手刷新 updated_at，返回更新后的记录
#[tauri::command]
pub fn update_note(
    state: State<'_, AppState>,
    id: i64,
    title: String,
    content: String,
) -> Result<Note, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "UPDATE notes
         SET title = ?1,
             content = ?2,
             updated_at = (strftime('%s', 'now') * 1000)
         WHERE id = ?3
         RETURNING id, title, content, created_at, updated_at",
        rusqlite::params![title, content, id],
        Note::from_row,
    )
    .map_err(db_err)
}

/// 删除
#[tauri::command]
pub fn delete_note(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM notes WHERE id = ?1", rusqlite::params![id]).map_err(db_err)?;
    Ok(())
}
