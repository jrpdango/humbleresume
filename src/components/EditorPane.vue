<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useEditor } from '../composables/useEditor'
import { appStore } from '../stores/appStore'

const props = defineProps<{
  onEditorScroll?: (scrollTop: number, scrollHeight: number, clientHeight: number) => void
}>()

const emit = defineEmits<{
  contentChange: [content: string]
}>()

const containerRef = ref<HTMLElement | null>(null)

const { initEditor, setContent, setTheme, setScrollByRatio, dispose } = useEditor(
  containerRef,
  (content) => {
    if (appStore.currentFile) appStore.currentFile.content = content
    emit('contentChange', content)
  },
  (scrollTop, scrollHeight, clientHeight) => {
    props.onEditorScroll?.(scrollTop, scrollHeight, clientHeight)
  },
)

onMounted(() => initEditor())
onUnmounted(() => dispose())

watch(
  () => appStore.currentFile?.content,
  (content) => { if (content !== undefined) setContent(content) },
)

watch(() => appStore.appTheme, (theme) => setTheme(theme))

defineExpose({ setScrollByRatio })
</script>

<template>
  <div class="editor-pane">
    <div ref="containerRef" class="monaco-container" />
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

.monaco-container {
  flex: 1;
  height: 100%;
}
</style>
