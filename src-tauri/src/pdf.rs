use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{
    AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
};

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportRequest {
    path: String,
    content: String,
    css: String,
    page_size: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportPayload {
    path: String,
    content: String,
    css: String,
    page_size: String,
}

#[derive(Default)]
pub struct ExportState {
    payload: Mutex<Option<ExportPayload>>,
}

/// Starts a native, dialog-free PDF export. Creates a dedicated export window
/// that renders only the paginated resume, then prints that window with the
/// selected paper size and zero margins. Completion is reported asynchronously
/// via a `pdf-export-result` event (`{ ok: bool, error?: string }`) on the main
/// window, since every platform's underlying print API completes through a
/// callback.
#[tauri::command]
pub fn export_pdf(
    app: AppHandle,
    state: State<'_, ExportState>,
    payload: ExportRequest,
) -> Result<(), String> {
    *state.payload.lock().unwrap() = Some(ExportPayload {
        path: payload.path,
        content: payload.content,
        css: payload.css,
        page_size: payload.page_size,
    });

    if let Some(existing) = app.get_webview_window("export") {
        let _ = existing.close();
    }

    // Kept visible but positioned far offscreen: hidden webviews may skip
    // layout on some platforms, which would break pagination and printing.
    WebviewWindowBuilder::new(&app, "export", WebviewUrl::App("index.html?mode=export".into()))
        .title("HumbleResume Export")
        .inner_size(900.0, 1200.0)
        .position(-10000.0, -10000.0)
        .decorations(false)
        .skip_taskbar(true)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_export_payload(state: State<'_, ExportState>) -> Option<ExportPayload> {
    state.payload.lock().unwrap().clone()
}

/// Called by the export window once it has rendered and paginated the resume.
/// Runs on the main thread so platform print APIs can be used directly.
#[tauri::command]
pub fn export_ready(
    app: AppHandle,
    export_window: WebviewWindow,
    state: State<'_, ExportState>,
) -> Result<(), String> {
    let payload = state
        .payload
        .lock()
        .unwrap()
        .take()
        .ok_or_else(|| "no export payload available".to_string())?;

    let main_window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;

    print_window(&export_window, &main_window, &payload)
}

/// Called by the export window if it fails to render the resume.
#[tauri::command]
pub fn export_failed(app: AppHandle, message: String) -> Result<(), String> {
    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.emit(
            "pdf-export-result",
            serde_json::json!({ "ok": false, "error": message }),
        );
    }
    if let Some(window) = app.get_webview_window("export") {
        let _ = window.close();
    }
    Ok(())
}

/// Aborts an in-flight export (e.g. when the frontend times out).
#[tauri::command]
pub fn cancel_export(app: AppHandle, state: State<'_, ExportState>) -> Result<(), String> {
    *state.payload.lock().unwrap() = None;
    if let Some(window) = app.get_webview_window("export") {
        let _ = window.close();
    }
    Ok(())
}

fn print_window(
    export_window: &WebviewWindow,
    main_window: &WebviewWindow,
    payload: &ExportPayload,
) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    return linux::print(export_window, main_window, payload);

    #[cfg(target_os = "macos")]
    return macos::print(export_window, main_window, payload);

    #[cfg(windows)]
    return windows_impl::print(export_window, main_window, payload);

    #[cfg(not(any(target_os = "linux", target_os = "macos", windows)))]
    {
        let _ = (export_window, main_window, payload);
        Err("PDF export is not supported on this platform".into())
    }
}

fn finish(main_window: &WebviewWindow, export_window: &WebviewWindow, ok: bool, error: Option<String>) {
    let _ = main_window.emit(
        "pdf-export-result",
        serde_json::json!({ "ok": ok, "error": error }),
    );
    let _ = export_window.close();
}

#[cfg(target_os = "linux")]
mod linux {
    use super::{finish, ExportPayload};
    use tauri::WebviewWindow;
    use webkit2gtk::{PrintOperation, PrintOperationExt};

    pub fn print(
        export_window: &WebviewWindow,
        main_window: &WebviewWindow,
        payload: &ExportPayload,
    ) -> Result<(), String> {
        let path = payload.path.clone();
        let paper_name = if payload.page_size == "A4" {
            "iso_a4"
        } else {
            "na_letter"
        };
        let uri = format!("file://{path}");
        let main = main_window.clone();
        let export = export_window.clone();

        export_window
            .with_webview(move |platform_webview| {
                let webview = platform_webview.inner();
                let operation = PrintOperation::new(&webview);

                let settings = gtk::PrintSettings::new();
                // Paper size must be set explicitly: GTK otherwise falls back
                // to the system default (commonly Letter), which desyncs the
                // printed page size from the preview's page size.
                let paper = gtk::PaperSize::new(Some(paper_name));
                settings.set_paper_size(&paper);
                settings.set_double("margin-top", 0.0);
                settings.set_double("margin-bottom", 0.0);
                settings.set_double("margin-left", 0.0);
                settings.set_double("margin-right", 0.0);
                settings.set("output-file-format", Some("pdf"));
                settings.set_bool("print-header", false);
                settings.set_bool("print-footer", false);
                // Routes the job through GTK's virtual "Print to File" backend
                // instead of a real printer, writing straight to `output-uri`.
                settings.set_printer("Print to File");
                settings.set("output-uri", Some(uri.as_str()));
                operation.set_print_settings(&settings);

                // The page setup (not just the print settings) carries the
                // paper size and margins that WebKitGTK actually honors when
                // laying out the print job.
                let page_setup = gtk::PageSetup::new();
                page_setup.set_paper_size(&paper);
                page_setup.set_top_margin(0.0, gtk::Unit::Mm);
                page_setup.set_bottom_margin(0.0, gtk::Unit::Mm);
                page_setup.set_left_margin(0.0, gtk::Unit::Mm);
                page_setup.set_right_margin(0.0, gtk::Unit::Mm);
                operation.set_page_setup(&page_setup);

                let finished_main = main.clone();
                let finished_export = export.clone();
                operation.connect_finished(move |_| {
                    finish(&finished_main, &finished_export, true, None);
                });

                let failed_main = main.clone();
                let failed_export = export.clone();
                operation.connect_failed(move |_, error| {
                    finish(&failed_main, &failed_export, false, Some(error.to_string()));
                });

                operation.print();
            })
            .map_err(|e| e.to_string())
    }
}

#[cfg(target_os = "macos")]
mod macos {
    use super::{finish, ExportPayload};
    use block2::RcBlock;
    use objc2::rc::Retained;
    use objc2::MainThreadMarker;
    use objc2_foundation::{NSData, NSError, NSString, NSURL};
    use objc2_web_kit::{WKPDFConfiguration, WKWebView};
    use std::ptr::NonNull;
    use tauri::WebviewWindow;

    pub fn print(
        export_window: &WebviewWindow,
        main_window: &WebviewWindow,
        payload: &ExportPayload,
    ) -> Result<(), String> {
        let path = payload.path.clone();
        let main = main_window.clone();
        let export = export_window.clone();

        export_window
            .with_webview(move |platform_webview| unsafe {
                let webview_ptr = platform_webview.inner() as *mut WKWebView;
                let Some(webview_ptr) = NonNull::new(webview_ptr) else {
                    finish(&main, &export, false, Some("no webview handle".into()));
                    return;
                };
                let webview: Retained<WKWebView> = Retained::retain(webview_ptr.as_ptr())
                    .expect("webview pointer must be valid");

                let mtm = MainThreadMarker::new().expect("must be called on main thread");
                let config = WKPDFConfiguration::new(mtm);
                let complete_main = main.clone();
                let complete_export = export.clone();
                let handler = RcBlock::new(move |data: *mut NSData, error: *mut NSError| {
                    if let Some(error) = error.as_ref() {
                        finish(
                            &complete_main,
                            &complete_export,
                            false,
                            Some(error.localizedDescription().to_string()),
                        );
                        return;
                    }
                    let Some(data) = data.as_ref() else {
                        finish(&complete_main, &complete_export, false, Some("no PDF data returned".into()));
                        return;
                    };
                    let path = NSString::from_str(&path);
                    let url = NSURL::fileURLWithPath(&path);
                    if data.writeToURL_atomically(&url, true) {
                        finish(&complete_main, &complete_export, true, None);
                    } else {
                        finish(&complete_main, &complete_export, false, Some("failed to write PDF file".into()));
                    }
                });

                webview.createPDFWithConfiguration_completionHandler(Some(&config), &handler);
            })
            .map_err(|e| e.to_string())
    }
}

#[cfg(windows)]
mod windows_impl {
    use super::{finish, ExportPayload};
    use tauri::WebviewWindow;
    use webview2_com::Microsoft::Web::WebView2::Win32::{
        ICoreWebView2PrintSettings, ICoreWebView2PrintToPdfCompletedHandler,
        ICoreWebView2PrintToPdfCompletedHandler_Impl, ICoreWebView2_7,
    };
    use windows::core::{implement, Error as WindowsError, Result as WindowsResult, PCWSTR, HSTRING};
    use windows_core::BOOL;

    #[implement(ICoreWebView2PrintToPdfCompletedHandler)]
    struct PrintToPdfCompletedHandler {
        main_window: WebviewWindow,
        export_window: WebviewWindow,
    }

    impl ICoreWebView2PrintToPdfCompletedHandler_Impl for PrintToPdfCompletedHandler_Impl {
        fn Invoke(&self, errorcode: WindowsResult<()>, issuccessful: BOOL) -> WindowsResult<()> {
            match errorcode {
                Ok(()) if issuccessful.as_bool() => {
                    finish(&self.main_window, &self.export_window, true, None);
                }
                Ok(()) => {
                    finish(&self.main_window, &self.export_window, false, Some("print job did not complete".into()));
                }
                Err(err) => {
                    finish(&self.main_window, &self.export_window, false, Some(err.message()));
                }
            }
            Ok(())
        }
    }

    fn paper_dims_inches(page_size: &str) -> (f64, f64) {
        match page_size {
            "A4" => (210.0 / 25.4, 297.0 / 25.4),
            _ => (8.5, 11.0),
        }
    }

    pub fn print(
        export_window: &WebviewWindow,
        main_window: &WebviewWindow,
        payload: &ExportPayload,
    ) -> Result<(), String> {
        let path = payload.path.clone();
        let (width_in, height_in) = paper_dims_inches(&payload.page_size);
        let main = main_window.clone();
        let export = export_window.clone();

        export_window
            .with_webview(move |platform_webview| {
                let error_main = main.clone();
                let error_export = export.clone();
                let handler_main = main.clone();
                let handler_export = export.clone();

                let run = move || -> WindowsResult<()> {
                    let controller = platform_webview.controller();
                    let webview = controller.CoreWebView2()?;
                    let webview: ICoreWebView2_7 = webview.cast()?;

                    let environment = platform_webview.environment();
                    let settings: ICoreWebView2PrintSettings = environment.CreatePrintSettings()?;

                    settings.SetPageWidth(width_in)?;
                    settings.SetPageHeight(height_in)?;
                    settings.SetMarginTop(0.0)?;
                    settings.SetMarginBottom(0.0)?;
                    settings.SetMarginLeft(0.0)?;
                    settings.SetMarginRight(0.0)?;
                    settings.SetShouldPrintBackgrounds(BOOL::from(true))?;
                    settings.SetShouldPrintHeaderAndFooter(BOOL::from(false))?;
                    settings.SetScaleFactor(1.0)?;

                    let handler: ICoreWebView2PrintToPdfCompletedHandler =
                        PrintToPdfCompletedHandler {
                            main_window: handler_main,
                            export_window: handler_export,
                        }
                        .into();

                    let path_wide = HSTRING::from(path.as_str());
                    webview.PrintToPdf(PCWSTR(path_wide.as_ptr()), &settings, &handler)
                };

                if let Err(err) = run() {
                    finish(&error_main, &error_export, false, Some(err.message()));
                }
            })
            .map_err(|e: tauri::Error| e.to_string())
    }
}
