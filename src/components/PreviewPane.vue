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
const { previewHtml, update, getPageClass } = usePreview();

let templateStyleEl: HTMLStyleElement | null = null;

function injectTemplateStyle() {
  if (!templateStyleEl) {
    templateStyleEl = document.createElement("style");
    document.head.appendChild(templateStyleEl);
  }
  templateStyleEl.textContent = getTemplateCss(appStore.templateName);
}

onMounted(() => {
  injectTemplateStyle();
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
  () => appStore.templateName,
  () => injectTemplateStyle(),
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
  <div ref="containerRef" class="preview-pane" @scroll.passive="onScroll">
    <div class="page" :class="getPageClass()" v-html="previewHtml" />
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
  min-width: 0;
}

.page {
  background: white;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.12);
  color: #000;
  flex-shrink: 0;
}

.page-a4 {
  width: 210mm;
  min-height: 297mm;
  padding: 20mm 20mm;
}

.page-letter {
  width: 8.5in;
  min-height: 11in;
  padding: 1in 1in;
}
</style>
