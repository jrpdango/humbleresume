import { reactive } from "vue";

export type View = "home" | "editor";
export type TemplateName = "modern" | "minimal" | "academic";
export type AppTheme = "light" | "dark";
export type SaveStatus = "saved" | "saving" | "unsaved";
export type PageSize = "A4" | "Letter";
export type EditorTab = "markdown" | "css";

export interface RecentFile {
  path: string;
  name: string;
  lastOpened: number;
}

export interface CurrentFile {
  path: string | null;
  content: string;
  customCss: string | null;
}

interface AppState {
  view: View;
  currentFile: CurrentFile | null;
  recentFiles: RecentFile[];
  templateName: TemplateName;
  appTheme: AppTheme;
  saveStatus: SaveStatus;
  pageSize: PageSize;
  editorTab: EditorTab;
  updateAvailable: { version: string; url: string } | null;
}

const RECENT_KEY = "humbleresume_recent";
const SETTINGS_KEY = "humbleresume_settings";

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const savedSettings = loadJSON<Partial<AppState>>(SETTINGS_KEY, {});

export const appStore = reactive<AppState>({
  view: "home",
  currentFile: null,
  recentFiles: loadJSON<RecentFile[]>(RECENT_KEY, []),
  templateName: savedSettings.templateName ?? "modern",
  appTheme: savedSettings.appTheme ?? "light",
  saveStatus: "saved",
  pageSize: savedSettings.pageSize ?? "A4",
  editorTab: "markdown",
  updateAvailable: null,
});

export function persistSettings() {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      templateName: appStore.templateName,
      appTheme: appStore.appTheme,
      pageSize: appStore.pageSize,
    }),
  );
}

export function addRecentFile(path: string) {
  const name = path.split(/[\\/]/).pop() ?? path;
  const idx = appStore.recentFiles.findIndex((f) => f.path === path);
  if (idx !== -1) appStore.recentFiles.splice(idx, 1);
  appStore.recentFiles.unshift({ path, name, lastOpened: Date.now() });
  if (appStore.recentFiles.length > 10) appStore.recentFiles.length = 10;
  localStorage.setItem(RECENT_KEY, JSON.stringify(appStore.recentFiles));
}

export function removeRecentFile(path: string) {
  const idx = appStore.recentFiles.findIndex((f) => f.path === path);
  if (idx !== -1) appStore.recentFiles.splice(idx, 1);
  localStorage.setItem(RECENT_KEY, JSON.stringify(appStore.recentFiles));
}
