import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { appStore } from "../stores/appStore";

interface PdfExportResult {
  ok: boolean;
  error?: string;
}

function defaultPdfPath(): string {
  const mdPath = appStore.currentFile?.path;
  if (mdPath) return mdPath.replace(/\.(md|markdown|txt)$/, "") + ".pdf";
  return "resume.pdf";
}

export function usePdfExport() {
  async function exportPdf() {
    const path = await saveDialog({
      filters: [{ name: "PDF", extensions: ["pdf"] }],
      defaultPath: defaultPdfPath(),
    });
    if (!path) return;

    let resolve!: () => void;
    let reject!: (err: Error) => void;
    const result = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    // Listen before invoking so the completion event can't arrive before we're ready for it.
    const unlisten = await listen<PdfExportResult>(
      "pdf-export-result",
      (event) => {
        unlisten();
        if (event.payload.ok) resolve();
        else reject(new Error(event.payload.error ?? "PDF export failed"));
      },
    );

    try {
      await invoke("export_pdf", { path });
    } catch (err) {
      unlisten();
      throw err;
    }
    await result;
  }

  return { exportPdf };
}
