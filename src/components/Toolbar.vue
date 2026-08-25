<script setup lang="ts">
import { computed, ref } from "vue";
import { appStore, persistSettings } from "../stores/appStore";
import { useFileSystem } from "../composables/useFileSystem";
import { usePdfExport } from "../composables/usePdfExport";
import { setTemplate, setAppTheme, getTemplateCss } from "../services/theme";
import { openUrl } from "@tauri-apps/plugin-opener";
import { confirm as confirmDialog } from "@tauri-apps/plugin-dialog";
import type { TemplateName, PageSize } from "../stores/appStore";
import moonSvg from "../assets/moon.svg?raw";
import sunSvg from "../assets/sun.svg?raw";

const { saveFile, saveFileAs, openFile } = useFileSystem();
const { exportPdf: exportPdfNative } = usePdfExport();
const isExportingPdf = ref(false);

const saveStatusLabel = computed(() => {
  switch (appStore.saveStatus) {
    case "saving":
      return "Saving…";
    case "unsaved":
      return "Unsaved";
    default:
      return "Saved";
  }
});

const saveStatusClass = computed(() => ({
  "status-saved": appStore.saveStatus === "saved",
  "status-saving": appStore.saveStatus === "saving",
  "status-unsaved": appStore.saveStatus === "unsaved",
}));

function goHome() {
  appStore.view = "home";
}

function printResume() {
  window.print();
}

async function exportPdf() {
  isExportingPdf.value = true;
  try {
    await exportPdfNative();
  } catch (err) {
    await confirmDialog(err instanceof Error ? err.message : String(err), {
      title: "Export PDF Failed",
      kind: "error",
    });
  } finally {
    isExportingPdf.value = false;
  }
}

function toggleTheme() {
  setAppTheme(appStore.appTheme === "light" ? "dark" : "light");
}

function changePageSize(e: Event) {
  appStore.pageSize = (e.target as HTMLSelectElement).value as PageSize;
  persistSettings();
}

async function handleTemplateChange(e: Event) {
  const newTemplate = (e.target as HTMLSelectElement).value as TemplateName;
  const file = appStore.currentFile;
  if (
    file?.customCss != null &&
    file.customCss !== getTemplateCss(appStore.templateName)
  ) {
    const ok = await confirmDialog(
      "Switching templates will reset your custom CSS to the new template's defaults. Continue?",
      { title: "Switch Template", kind: "warning" },
    );
    if (!ok) {
      (e.target as HTMLSelectElement).value = appStore.templateName;
      return;
    }
  }
  setTemplate(newTemplate);
  if (file) {
    file.customCss = getTemplateCss(newTemplate);
  }
}

async function openUpdatePage() {
  if (appStore.updateAvailable) await openUrl(appStore.updateAvailable.url);
}
</script>

<template>
  <header class="toolbar">
    <div class="toolbar-section toolbar-left">
      <button class="btn-icon" title="Home" @click="goHome">⌂</button>
      <span class="app-name">HumbleResume</span>
    </div>

    <div class="toolbar-section toolbar-center">
      <button class="btn" @click="openFile()">Open</button>
      <button class="btn" @click="saveFile">Save</button>
      <button class="btn" @click="saveFileAs">Save As</button>
      <div class="sep" />
      <select
        class="select"
        :value="appStore.templateName"
        @change="handleTemplateChange"
      >
        <option value="modern">Modern</option>
        <option value="minimal">Minimal</option>
        <option value="academic">Academic</option>
      </select>
      <select
        class="select"
        :value="appStore.pageSize"
        @change="changePageSize"
      >
        <option value="A4">A4</option>
        <option value="Letter">Letter</option>
      </select>
      <div class="sep" />
      <button class="btn" @click="printResume">Print…</button>
      <button
        class="btn btn-primary"
        :disabled="isExportingPdf"
        @click="exportPdf"
      >
        {{ isExportingPdf ? "Exporting…" : "Export PDF" }}
      </button>
    </div>

    <div class="toolbar-section toolbar-right">
      <span class="save-status" :class="saveStatusClass">{{
        saveStatusLabel
      }}</span>
      <button
        class="btn-icon"
        :title="
          appStore.appTheme === 'dark'
            ? 'Switch to light mode'
            : 'Switch to dark mode'
        "
        @click="toggleTheme"
      >
        <span class="btn-icon-svg" v-html="appStore.appTheme === 'dark' ? moonSvg : sunSvg" />
      </button>
      <button
        v-if="appStore.updateAvailable"
        class="btn btn-update"
        @click="openUpdatePage"
      >
        Update {{ appStore.updateAvailable.version }} ↗
      </button>
    </div>
  </header>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 12px;
  height: 48px;
  background: var(--toolbar-bg);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  user-select: none;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-left {
  min-width: 160px;
}

.toolbar-right {
  min-width: 160px;
  justify-content: flex-end;
}

.app-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text);
}

.btn {
  padding: 4px 10px;
  border: 1px solid var(--border);
  background: var(--btn-bg);
  color: var(--text);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.82rem;
  transition: background 0.12s;
  white-space: nowrap;
}

.btn:hover {
  background: var(--btn-hover);
}

.btn-primary {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

.btn-primary:hover {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
}

.btn-update {
  background: #f59e0b;
  color: white;
  border-color: #f59e0b;
  font-size: 0.78rem;
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.15rem;
  color: var(--text);
  padding: 4px 6px;
  border-radius: 4px;
  transition: background 0.12s;
}

.btn-icon:hover {
  background: var(--btn-hover);
}

.btn-icon-svg {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.15rem;
  height: 1.15rem;
}

.select {
  padding: 4px 6px;
  border: 1px solid var(--border);
  background: var(--btn-bg);
  color: var(--text);
  border-radius: 4px;
  font-size: 0.82rem;
  cursor: pointer;
}

.sep {
  width: 1px;
  height: 20px;
  background: var(--border);
  flex-shrink: 0;
}

.save-status {
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
}

.status-saved {
  background: #d1fae5;
  color: #065f46;
}
.status-saving {
  background: #fef3c7;
  color: #92400e;
}
.status-unsaved {
  background: #fee2e2;
  color: #991b1b;
}
</style>
