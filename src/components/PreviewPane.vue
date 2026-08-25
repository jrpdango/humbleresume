<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import { usePreview } from "../composables/usePreview";
import { usePreviewZoom } from "../composables/usePreviewZoom";
import { getTemplateCss } from "../services/theme";
import { appStore } from "../stores/appStore";
import "katex/dist/katex.min.css";

const emit = defineEmits<{
  scroll: [scrollTop: number, scrollHeight: number, clientHeight: number];
}>();

const containerRef = ref<HTMLElement | null>(null);
const { pages, update, getPageClass } = usePreview();
const {
  panMode,
  isDragging,
  zoomLabel,
  zoomWrapperStyle,
  zoomIn,
  zoomOut,
  togglePan,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
} = usePreviewZoom(containerRef);

let templateStyleEl: HTMLStyleElement | null = null;
let printPageStyleEl: HTMLStyleElement | null = null;

function injectStyle() {
  if (!templateStyleEl) {
    templateStyleEl = document.createElement("style");
    document.head.appendChild(templateStyleEl);
  }
  templateStyleEl.textContent =
    appStore.currentFile?.customCss ?? getTemplateCss(appStore.templateName);
}

function injectPrintPageStyle() {
  if (!printPageStyleEl) {
    printPageStyleEl = document.createElement("style");
    document.head.appendChild(printPageStyleEl);
  }
  printPageStyleEl.textContent = `@media print { @page { size: ${appStore.pageSize === "A4" ? "A4" : "letter"}; margin: 0; } }`;
}

function repaginate() {
  if (appStore.currentFile?.content !== undefined) {
    update(appStore.currentFile.content);
  }
}

onMounted(() => {
  injectStyle();
  injectPrintPageStyle();
  if (appStore.currentFile) update(appStore.currentFile.content);
});

onUnmounted(() => {
  templateStyleEl?.remove();
  templateStyleEl = null;
  printPageStyleEl?.remove();
  printPageStyleEl = null;
});

watch(
  () => appStore.currentFile?.content,
  (content) => {
    if (content !== undefined) update(content);
  },
);

watch(
  () => appStore.currentFile?.customCss,
  () => {
    injectStyle();
    repaginate();
  },
);

watch(
  () => appStore.templateName,
  () => {
    injectStyle();
    repaginate();
  },
);

watch(
  () => appStore.pageSize,
  () => {
    injectPrintPageStyle();
    repaginate();
  },
);

function onScroll(e: Event) {
  const el = e.target as HTMLElement;
  emit("scroll", el.scrollTop, el.scrollHeight, el.clientHeight);
}

defineExpose({
  get el() {
    return containerRef.value;
  },
});
</script>

<template>
  <div
    ref="containerRef"
    class="preview-pane"
    :class="{ 'pan-mode': panMode, grabbing: isDragging }"
    :style="panMode ? { touchAction: 'none' } : {}"
    @scroll.passive="onScroll"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
  >
    <div class="preview-zoom-wrapper" :style="zoomWrapperStyle">
      <div
        v-for="(pageHtml, i) in pages"
        :key="i"
        class="page"
        :class="getPageClass()"
        v-html="pageHtml"
      />
    </div>

    <div class="zoom-controls" @pointerdown.stop>
      <button
        class="zoom-btn"
        :class="{ active: panMode }"
        title="Pan mode"
        @click="togglePan"
      >
        &#10021;
      </button>
      <div class="zoom-sep" />
      <button class="zoom-btn" title="Zoom out" @click="zoomOut">
        &#8722;
      </button>
      <span class="zoom-label">{{ zoomLabel }}</span>
      <button class="zoom-btn" title="Zoom in" @click="zoomIn">&#43;</button>
    </div>
  </div>
</template>

<style scoped>
.preview-pane {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  background: var(--preview-bg);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  position: relative;
}

.preview-pane.pan-mode {
  cursor: grab;
}

.preview-pane.grabbing {
  cursor: grabbing;
  user-select: none;
}

.preview-zoom-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 16px;
  gap: 24px;
  margin: 0 auto;
}

.page {
  background: white;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.12);
  color: #000;
  flex-shrink: 0;
  overflow: visible;
}

.zoom-controls {
  position: fixed;
  bottom: 16px;
  align-self: flex-end;
  margin-right: 16px;
  display: flex;
  align-items: center;
  gap: 2px;
  background: var(--toolbar-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 3px 5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  user-select: none;
  z-index: 10;
}

.zoom-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  color: var(--text);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  line-height: 1;
  transition: background 0.12s;
}

.zoom-btn:hover {
  background: var(--btn-hover);
}

.zoom-btn.active {
  background: var(--accent);
  color: white;
}

.zoom-label {
  min-width: 36px;
  text-align: center;
  font-size: 0.75rem;
  color: var(--text);
}

.zoom-sep {
  width: 1px;
  height: 16px;
  background: var(--border);
  margin: 0 3px;
  flex-shrink: 0;
}
</style>

<!-- Outside of scoped since these are injected HTML -->
<style>
dl {
  display: flex;
  justify-content: space-between;
}

.page-a4 {
  width: 210mm;
  height: 297mm;
  padding: 12.7mm 12.7mm;
}

.page-letter {
  width: 215.9mm;
  height: 279.4mm;
  padding: 12.7mm 12.7mm;
}
</style>
