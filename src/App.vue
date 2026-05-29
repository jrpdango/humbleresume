<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { appStore } from "./stores/appStore";
import { setAppTheme } from "./services/theme";
import { useFileSystem } from "./composables/useFileSystem";
import { useScrollSync } from "./composables/useScrollSync";
import Toolbar from "./components/Toolbar.vue";
import EditorPane from "./components/EditorPane.vue";
import PreviewPane from "./components/PreviewPane.vue";
import ResumeList from "./components/ResumeList.vue";

const CURRENT_VERSION = "0.1.0";
const GITHUB_REPO = "jrpdango/humbleresume";

const previewPaneRef = ref<InstanceType<typeof PreviewPane> | null>(null);
const editorPaneRef = ref<InstanceType<typeof EditorPane> | null>(null);
const editorLayoutRef = ref<HTMLElement | null>(null);

const SPLIT_KEY = "humbleresume-pane-split";
const splitPercent = ref(Number(localStorage.getItem(SPLIT_KEY)) || 50);
const isDragging = ref(false);

const editorFlex = computed(() => splitPercent.value);
const previewFlex = computed(() => 100 - splitPercent.value);

function clampSplit(percent: number): number {
  if (!editorLayoutRef.value) return percent;
  const rect = editorLayoutRef.value.getBoundingClientRect();
  const total = window.innerWidth <= 900 ? rect.height : rect.width;
  const minPct = (20 / total) * 100;
  return Math.min(100 - minPct, Math.max(minPct, percent));
}

function applyDrag(clientX: number, clientY: number) {
  if (!editorLayoutRef.value) return;
  const rect = editorLayoutRef.value.getBoundingClientRect();
  const vertical = window.innerWidth <= 900;
  const offset = vertical ? clientY - rect.top : clientX - rect.left;
  const total = vertical ? rect.height : rect.width;
  splitPercent.value = clampSplit((offset / total) * 100);
  localStorage.setItem(SPLIT_KEY, String(splitPercent.value));
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value) return;
  applyDrag(e.clientX, e.clientY);
}

function stopDrag() {
  isDragging.value = false;
  document.body.style.userSelect = "";
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseup", stopDrag);
}

function startDrag() {
  isDragging.value = true;
  document.body.style.userSelect = "none";
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", stopDrag);
}

function onTouchMove(e: TouchEvent) {
  e.preventDefault();
  if (!isDragging.value) return;
  const t = e.touches[0];
  applyDrag(t.clientX, t.clientY);
}

function stopDragTouch() {
  isDragging.value = false;
  document.body.style.userSelect = "";
  document.removeEventListener("touchmove", onTouchMove);
  document.removeEventListener("touchend", stopDragTouch);
}

function startDragTouch() {
  isDragging.value = true;
  document.body.style.userSelect = "none";
  document.addEventListener("touchmove", onTouchMove, { passive: false });
  document.addEventListener("touchend", stopDragTouch);
}

function resetSplit() {
  splitPercent.value = 50;
  localStorage.setItem(SPLIT_KEY, "50");
}

const { markUnsaved } = useFileSystem();
const { syncEditorToPreview, syncPreviewToEditor } = useScrollSync();

const previewEl = computed(() => previewPaneRef.value?.el ?? null);

function onContentChange() {
  markUnsaved();
}

function onEditorScroll(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
) {
  if (appStore.editorTab === "css") return;
  const el = previewEl.value;
  if (el) syncEditorToPreview(scrollTop, scrollHeight, clientHeight, el);
}

function onPreviewScroll(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
) {
  if (appStore.editorTab === "css") return;
  syncPreviewToEditor(scrollTop, scrollHeight, clientHeight, (ratio) => {
    editorPaneRef.value?.setScrollByRatio(ratio);
  });
}

onMounted(async () => {
  setAppTheme(appStore.appTheme);

  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
    );
    if (res.ok) {
      const data = (await res.json()) as { tag_name: string; html_url: string };
      const latest = data.tag_name.replace(/^v/, "");
      if (latest !== CURRENT_VERSION) {
        appStore.updateAvailable = {
          version: `v${latest}`,
          url: data.html_url,
        };
      }
    }
  } catch {
    // silently ignore
  }
});
</script>

<template>
  <div class="app-root" :data-theme="appStore.appTheme">
    <div v-if="appStore.view === 'home'" class="home-screen-wrapper">
      <ResumeList />
    </div>

    <div v-else class="app-layout">
      <Toolbar />
      <div class="editor-layout" ref="editorLayoutRef">
        <EditorPane
          ref="editorPaneRef"
          :style="{ flex: editorFlex }"
          :on-editor-scroll="onEditorScroll"
          @content-change="onContentChange"
        />
        <div
          class="pane-divider"
          :class="{ dragging: isDragging }"
          @mousedown.prevent="startDrag"
          @touchstart.prevent="startDragTouch"
          @dblclick="resetSplit"
        />
        <PreviewPane
          ref="previewPaneRef"
          :style="{ flex: previewFlex }"
          @scroll="onPreviewScroll"
        />
      </div>
    </div>
  </div>
</template>

<style>
.app-root {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
}

.home-screen-wrapper {
  flex: 1;
  overflow-y: auto;
}

.app-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
}

@media (max-width: 900px) {
  .editor-layout {
    flex-direction: column;
  }
}

.pane-divider {
  flex-shrink: 0;
  width: 1px;
  background: var(--border);
  cursor: col-resize;
  transition: background 0.15s;
  position: relative;
  z-index: 1;
}

.pane-divider::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -4px;
  right: -4px;
}

.pane-divider:hover,
.pane-divider.dragging {
  background: var(--accent);
}

@media (max-width: 900px) {
  .pane-divider {
    width: 100%;
    height: 1px;
    cursor: row-resize;
  }

  .pane-divider::after {
    left: 0;
    right: 0;
    top: -4px;
    bottom: -4px;
  }
}
</style>
