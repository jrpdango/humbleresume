import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { appStore } from "../stores/appStore";
import { getTemplateCss } from "../services/theme";

interface PdfExportResult {
  ok: boolean;
  error?: string;
}

const EXPORT_TIMEOUT_MS = 60_000;

function defaultPdfPath(): string {
  const mdPath = appStore.currentFile?.path;
  if (mdPath) return mdPath.replace(/\.(md|markdown|txt)$/, "") + ".pdf";
  return "resume.pdf";
}

export function usePdfExport() {
  async function exportPdf() {
    const file = appStore.currentFile;
    if (!file) return;

    const path = await saveDialog({
      filters: [{ name: "PDF", extensions: ["pdf"] }],
      defaultPath: defaultPdfPath(),
    });
    if (!path) return;

    const payload = {
      path,
      content: file.content,
      css: file.customCss ?? getTemplateCss(appStore.templateName),
      pageSize: appStore.pageSize,
    };

    let resolve!: () => void;
    let reject!: (err: Error) => void;
    const result = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    // Listen before invoking so the completion event can't arrive before we're ready for it.
    const unlisten = await listen<PdfExportResult>(
      "pdf-export-result",
      (event) => {
        unlisten();
        if (timeoutId) clearTimeout(timeoutId);
        if (event.payload.ok) resolve();
        else reject(new Error(event.payload.error ?? "PDF export failed"));
      },
    );

    timeoutId = setTimeout(() => {
      unlisten();
      invoke("cancel_export").catch(() => {});
      reject(new Error("PDF export timed out"));
    }, EXPORT_TIMEOUT_MS);

    try {
      await invoke("export_pdf", { payload });
    } catch (err) {
      unlisten();
      if (timeoutId) clearTimeout(timeoutId);
      invoke("cancel_export").catch(() => {});
      throw err;
    }
    await result;
  }

  return { exportPdf };
}
