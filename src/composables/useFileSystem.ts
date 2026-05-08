import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import {
  open as openDialog,
  save as saveDialog,
} from "@tauri-apps/plugin-dialog";
import { appStore, addRecentFile } from "../stores/appStore";

let autosaveTimer: ReturnType<typeof setTimeout> | null = null;

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
    appStore.currentFile = { path: filePath, content };
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
    appStore.saveStatus = "saved";
    addRecentFile(filePath);
  }

  function scheduleAutosave() {
    if (!appStore.currentFile?.path) {
      appStore.saveStatus = "unsaved";
      return;
    }
    appStore.saveStatus = "unsaved";
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(async () => {
      if (!appStore.currentFile?.path) return;
      appStore.saveStatus = "saving";
      try {
        await writeTextFile(
          appStore.currentFile.path,
          appStore.currentFile.content,
        );
        appStore.saveStatus = "saved";
      } catch {
        appStore.saveStatus = "unsaved";
      }
    }, 2000);
  }

  function newFile(content = "") {
    appStore.currentFile = { path: null, content };
    appStore.saveStatus = "unsaved";
    appStore.view = "editor";
  }

  return { openFile, saveFile, saveFileAs, scheduleAutosave, newFile };
}
