use tauri::{Emitter, WebviewWindow};

/// Starts a native, dialog-free PDF export of the given window's current page.
/// Completion is reported asynchronously via a `pdf-export-result` event
/// (`{ ok: bool, error?: string }`) rather than the command's return value,
/// since every platform's underlying print API completes through a callback.
#[tauri::command]
pub fn export_pdf(window: WebviewWindow, path: String) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    return linux::export_pdf(window, path);

    #[cfg(target_os = "macos")]
    return macos::export_pdf(window, path);

    #[cfg(windows)]
    return windows_impl::export_pdf(window, path);

    #[cfg(not(any(target_os = "linux", target_os = "macos", windows)))]
    {
        let _ = (window, path);
        Err("PDF export is not supported on this platform".into())
    }
}

fn emit_result(window: &WebviewWindow, ok: bool, error: Option<String>) {
    let _ = window.emit(
        "pdf-export-result",
        serde_json::json!({ "ok": ok, "error": error }),
    );
}

#[cfg(target_os = "linux")]
mod linux {
    use super::emit_result;
    use tauri::WebviewWindow;
    use webkit2gtk::{PrintOperation, PrintOperationExt};

    pub fn export_pdf(window: WebviewWindow, path: String) -> Result<(), String> {
        let uri = format!("file://{path}");
        let event_window = window.clone();

        window
            .with_webview(move |platform_webview| {
                let webview = platform_webview.inner();
                let operation = PrintOperation::new(&webview);

                let settings = gtk::PrintSettings::new();
                // Routes the job through GTK's virtual "Print to File" backend
                // instead of a real printer, writing straight to `output-uri`.
                settings.set("printer", Some("Print to File"));
                settings.set("output-uri", Some(uri.as_str()));
                operation.set_print_settings(&settings);

                let finished_window = event_window.clone();
                operation.connect_finished(move |_| {
                    emit_result(&finished_window, true, None);
                });

                let failed_window = event_window.clone();
                operation.connect_failed(move |_, error| {
                    emit_result(&failed_window, false, Some(error.to_string()));
                });

                operation.print();
            })
            .map_err(|e| e.to_string())
    }
}

#[cfg(target_os = "macos")]
mod macos {
    use super::emit_result;
    use block2::RcBlock;
    use objc2::rc::Retained;
    use objc2::AnyThread;
    use objc2_foundation::{NSData, NSError, NSString, NSURL};
    use objc2_web_kit::{WKPDFConfiguration, WKWebView};
    use std::ptr::NonNull;
    use tauri::WebviewWindow;

    pub fn export_pdf(window: WebviewWindow, path: String) -> Result<(), String> {
        let event_window = window.clone();

        window
            .with_webview(move |platform_webview| unsafe {
                let webview_ptr = platform_webview.inner() as *mut WKWebView;
                let Some(webview_ptr) = NonNull::new(webview_ptr) else {
                    emit_result(&event_window, false, Some("no webview handle".into()));
                    return;
                };
                let webview: Retained<WKWebView> = Retained::retain(webview_ptr.as_ptr())
                    .expect("webview pointer must be valid");

                let config = WKPDFConfiguration::new();
                let complete_window = event_window.clone();
                let handler = RcBlock::new(move |data: *mut NSData, error: *mut NSError| {
                    if let Some(error) = error.as_ref() {
                        emit_result(&complete_window, false, Some(error.localizedDescription().to_string()));
                        return;
                    }
                    let Some(data) = data.as_ref() else {
                        emit_result(&complete_window, false, Some("no PDF data returned".into()));
                        return;
                    };
                    let path = NSString::from_str(&path);
                    let url = NSURL::fileURLWithPath(&path);
                    if data.writeToURL_atomically(&url, true) {
                        emit_result(&complete_window, true, None);
                    } else {
                        emit_result(&complete_window, false, Some("failed to write PDF file".into()));
                    }
                });

                webview.createPDFWithConfiguration_completionHandler(Some(&config), &handler);
            })
            .map_err(|e| e.to_string())
    }
}

#[cfg(windows)]
mod windows_impl {
    use super::emit_result;
    use tauri::WebviewWindow;
    use webview2_com::Microsoft::Web::WebView2::Win32::{
        ICoreWebView2PrintToPdfCompletedHandler, ICoreWebView2PrintToPdfCompletedHandler_Impl,
        ICoreWebView2_7,
    };
    use windows::core::{implement, Error as WindowsError, Result as WindowsResult, PCWSTR, HSTRING};
    use windows_core::BOOL;

    #[implement(ICoreWebView2PrintToPdfCompletedHandler)]
    struct PrintToPdfCompletedHandler {
        window: WebviewWindow,
    }

    impl ICoreWebView2PrintToPdfCompletedHandler_Impl for PrintToPdfCompletedHandler_Impl {
        fn Invoke(&self, errorcode: WindowsResult<()>, issuccessful: BOOL) -> WindowsResult<()> {
            match errorcode {
                Ok(()) if issuccessful.as_bool() => {
                    emit_result(&self.window, true, None);
                }
                Ok(()) => {
                    emit_result(&self.window, false, Some("print job did not complete".into()));
                }
                Err(err) => {
                    emit_result(&self.window, false, Some(err.message()));
                }
            }
            Ok(())
        }
    }

    pub fn export_pdf(window: WebviewWindow, path: String) -> Result<(), String> {
        let event_window = window.clone();

        window
            .with_webview(move |platform_webview| {
                let run = || -> WindowsResult<()> {
                    let controller = platform_webview.controller();
                    let webview = controller.CoreWebView2()?;
                    let webview: ICoreWebView2_7 = webview.cast()?;

                    let environment = platform_webview.environment();
                    let settings = environment.CreatePrintSettings()?;

                    let handler: ICoreWebView2PrintToPdfCompletedHandler =
                        PrintToPdfCompletedHandler {
                            window: event_window.clone(),
                        }
                        .into();

                    let path_wide = HSTRING::from(path.as_str());
                    webview.PrintToPdf(PCWSTR(path_wide.as_ptr()), &settings, &handler)
                };

                if let Err(err) = run() {
                    emit_result(&event_window, false, Some(err.message()));
                }
            })
            .map_err(|e: tauri::Error| e.to_string())
    }
}
