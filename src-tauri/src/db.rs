use rusqlite::Connection;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

/// 应用全局共享状态。
/// SQLite 连接不是线程安全的，用 Mutex 包起来，
/// 所有命令通过 tauri::State<AppState> 拿到同一份。
pub struct AppState {
    pub conn: Mutex<Connection>,
}

/// 启动时调用：打开（或创建）数据库文件并建表
pub fn init(app: &AppHandle) -> Result<AppState, String> {
    // 数据目录 = %APPDATA%\com.alan.markdown-notes\
    // 这是 Tauri 约定的应用专属数据位置，卸载/备份都好找
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取数据目录: {e}"))?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("创建数据目录失败: {e}"))?;

    let conn = Connection::open(dir.join("notes.db"))
        .map_err(|e| format!("打开数据库失败: {e}"))?;

    // WAL 模式：读写并发更好；建表语句可重复执行（IF NOT EXISTS）
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         CREATE TABLE IF NOT EXISTS notes (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            title      TEXT    NOT NULL,
            content    TEXT    NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
         );",
    )
    .map_err(|e| format!("初始化表结构失败: {e}"))?;

    Ok(AppState {
        conn: Mutex::new(conn),
    })
}
