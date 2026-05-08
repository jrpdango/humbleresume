import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import {
  open as openDialog,
  save as saveDialog,
} from "@tauri-apps/plugin-dialog";
import { appStore, addRecentFile } from "../stores/appStore";
import { getTemplateCss } from "../services/theme";

function getCssPath(mdPath: string): string {
  return mdPath.replace(/\.(md|markdown|txt)$/, "") + ".css";
}

export function useFileSystem() {
  async function openFile(path?: string) {
    let filePath = path;
    if (!filePath) {
      const selected = await openDialog({
        filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }],
        multiple: false,
      });
      if (!selected || typeof selected !== "string") return;
      filePath = selected;
    }
    const content = await readTextFile(filePath);
    let customCss: string;
    try {
      customCss = await readTextFile(getCssPath(filePath));
    } catch {
      customCss = getTemplateCss(appStore.templateName);
    }
    appStore.currentFile = { path: filePath, content, customCss };
    appStore.saveStatus = "saved";
    appStore.view = "editor";
    addRecentFile(filePath);
  }

  async function saveFile() {
    if (!appStore.currentFile) return;
    if (!appStore.currentFile.path) {
      await saveFileAs();
      return;
    }
    appStore.saveStatus = "saving";
    await writeTextFile(
      appStore.currentFile.path,
      appStore.currentFile.content,
    );
    if (appStore.currentFile.customCss != null) {
      await writeTextFile(
        getCssPath(appStore.currentFile.path),
        appStore.currentFile.customCss,
      );
    }
    appStore.saveStatus = "saved";
    addRecentFile(appStore.currentFile.path);
  }

  async function saveFileAs() {
    if (!appStore.currentFile) return;
    const filePath = await saveDialog({
      filters: [{ name: "Markdown", extensions: ["md"] }],
      defaultPath: appStore.currentFile.path ?? "resume.md",
    });
    if (!filePath) return;
    appStore.currentFile.path = filePath;
    appStore.saveStatus = "saving";
    await writeTextFile(filePath, appStore.currentFile.content);
    if (appStore.currentFile.customCss != null) {
      await writeTextFile(getCssPath(filePath), appStore.currentFile.customCss);
    }
    appStore.saveStatus = "saved";
    addRecentFile(filePath);
  }

  function markUnsaved() {
    appStore.saveStatus = "unsaved";
  }

  function newFile(content = "") {
    appStore.currentFile = {
      path: null,
      content,
      customCss: getTemplateCss(appStore.templateName),
    };
    appStore.saveStatus = "unsaved";
    appStore.view = "editor";
  }

  return { openFile, saveFile, saveFileAs, markUnsaved, newFile };
}
