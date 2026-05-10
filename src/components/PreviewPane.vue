<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import { usePreview } from "../composables/usePreview";
import { getTemplateCss } from "../services/theme";
import { appStore } from "../stores/appStore";
import "katex/dist/katex.min.css";

const emit = defineEmits<{
  scroll: [scrollTop: number, scrollHeight: number, clientHeight: number];
}>();

const containerRef = ref<HTMLElement | null>(null);
const { pages, update, getPageClass } = usePreview();

let templateStyleEl: HTMLStyleElement | null = null;

function injectStyle() {
  if (!templateStyleEl) {
    templateStyleEl = document.createElement("style");
    document.head.appendChild(templateStyleEl);
  }
  templateStyleEl.textContent =
    appStore.currentFile?.customCss ?? getTemplateCss(appStore.templateName);
}

function repaginate() {
  if (appStore.currentFile?.content !== undefined) {
    update(appStore.currentFile.content);
  }
}

onMounted(() => {
  injectStyle();
  if (appStore.currentFile) update(appStore.currentFile.content);
});

onUnmounted(() => {
  templateStyleEl?.remove();
  templateStyleEl = null;
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

watch(() => appStore.pageSize, repaginate);

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
  <div ref="containerRef" class="preview-pane" @scroll.passive="onScroll">
    <div
      v-for="(pageHtml, i) in pages"
      :key="i"
      class="page"
      :class="getPageClass()"
      v-html="pageHtml"
    />
  </div>
</template>

<style scoped>
.preview-pane {
  flex: 1;
  overflow-y: auto;
  background: var(--preview-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 16px;
  gap: 24px;
  min-width: 0;
}

.page {
  background: white;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.12);
  color: #000;
  flex-shrink: 0;
  overflow: visible;
}

.page-a4 {
  width: 8.27in;
  height: 11.69in;
  padding: 0.5in 0.5in;
}

.page-letter {
  width: 8.5in;
  height: 11in;
  padding: 0.5in 0.5in;
}
</style>
