<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useEditor } from "../composables/useEditor";
import { useCssEditor } from "../composables/useCssEditor";
import { useFileSystem } from "../composables/useFileSystem";
import { appStore } from "../stores/appStore";

const props = defineProps<{
  onEditorScroll?: (
    scrollTop: number,
    scrollHeight: number,
    clientHeight: number,
  ) => void;
}>();

const emit = defineEmits<{
  contentChange: [content: string];
}>();

const mdContainerRef = ref<HTMLElement | null>(null);
const cssContainerRef = ref<HTMLElement | null>(null);

const { markUnsaved } = useFileSystem();

const { initEditor, setContent, setTheme, setScrollByRatio, dispose } =
  useEditor(
    mdContainerRef,
    (content) => {
      if (appStore.currentFile) appStore.currentFile.content = content;
      emit("contentChange", content);
    },
    (scrollTop, scrollHeight, clientHeight) => {
      props.onEditorScroll?.(scrollTop, scrollHeight, clientHeight);
    },
  );

const {
  initEditor: initCssEditor,
  setContent: setCssContent,
  setTheme: setCssTheme,
  dispose: disposeCss,
} = useCssEditor(cssContainerRef, (css) => {
  if (appStore.currentFile) appStore.currentFile.customCss = css;
  markUnsaved();
});

onMounted(() => {
  initEditor();
  initCssEditor();
});

onUnmounted(() => {
  dispose();
  disposeCss();
});

watch(
  () => appStore.currentFile?.content,
  (content) => {
    if (content !== undefined) setContent(content);
  },
);

watch(
  () => appStore.currentFile?.customCss,
  (css) => {
    if (css != null) setCssContent(css);
  },
);

watch(
  () => appStore.appTheme,
  (theme) => {
    setTheme(theme);
    setCssTheme(theme);
  },
);

defineExpose({ setScrollByRatio });
</script>

<template>
  <div class="editor-pane">
    <div class="editor-tabs">
      <button
        :class="['tab', { active: appStore.editorTab === 'markdown' }]"
        @click="appStore.editorTab = 'markdown'"
      >
        Markdown
      </button>
      <button
        :class="['tab', { active: appStore.editorTab === 'css' }]"
        @click="appStore.editorTab = 'css'"
      >
        CSS
      </button>
    </div>
    <div
      ref="mdContainerRef"
      v-show="appStore.editorTab === 'markdown'"
      class="monaco-container"
    />
    <div
      ref="cssContainerRef"
      v-show="appStore.editorTab === 'css'"
      class="monaco-container"
    />
  </div>
</template>

<style scoped>
.editor-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  border-right: 1px solid var(--border);
}

.editor-tabs {
  display: flex;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border);
  background: var(--toolbar-bg);
}

.tab {
  padding: 6px 16px;
  font-size: 0.82rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition:
    color 0.12s,
    border-color 0.12s;
}

.tab:hover {
  color: var(--text);
}

.tab.active {
  color: var(--text);
  border-bottom-color: var(--accent);
}

.monaco-container {
  flex: 1;
  height: 100%;
  min-height: 0;
}
</style>
