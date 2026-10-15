// 只有 release 构建才隐藏控制台窗口（dev 模式留着看日志）
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        // 插件：负责“用系统默认浏览器打开链接”等系统集成
        .plugin(tauri_plugin_opener::init())
        // 应用启动时初始化数据库，并把连接注册成全局共享状态
        .setup(|app| {
            let state = db::init(app.handle())?;
            app.manage(state);
            Ok(())
        })
        // 注册所有前端可调用的命令
        .invoke_handler(tauri::generate_handler![
            commands::list_notes,
            commands::get_note,
            commands::create_note,
            commands::update_note,
            commands::delete_note,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
