mod pdf;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(pdf::ExportState::default())
        .invoke_handler(tauri::generate_handler![
            pdf::export_pdf,
            pdf::export_ready,
            pdf::export_failed,
            pdf::cancel_export,
            pdf::get_export_payload
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
