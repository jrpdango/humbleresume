<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { appStore } from './stores/appStore'
import { setAppTheme } from './services/theme'
import { useFileSystem } from './composables/useFileSystem'
import { useScrollSync } from './composables/useScrollSync'
import Toolbar from './components/Toolbar.vue'
import EditorPane from './components/EditorPane.vue'
import PreviewPane from './components/PreviewPane.vue'
import ResumeList from './components/ResumeList.vue'

const CURRENT_VERSION = '0.1.0'
const GITHUB_REPO = 'jrpdango/humbleresume'

const previewPaneRef = ref<InstanceType<typeof PreviewPane> | null>(null)
const editorPaneRef = ref<InstanceType<typeof EditorPane> | null>(null)

const { scheduleAutosave } = useFileSystem()
const { syncEditorToPreview, syncPreviewToEditor } = useScrollSync()

const previewEl = computed(() => previewPaneRef.value?.el ?? null)

function onContentChange() {
  scheduleAutosave()
}

function onEditorScroll(scrollTop: number, scrollHeight: number, clientHeight: number) {
  const el = previewEl.value
  if (el) syncEditorToPreview(scrollTop, scrollHeight, clientHeight, el)
}

function onPreviewScroll(scrollTop: number, scrollHeight: number, clientHeight: number) {
  syncPreviewToEditor(scrollTop, scrollHeight, clientHeight, (ratio) => {
    editorPaneRef.value?.setScrollByRatio(ratio)
  })
}

onMounted(async () => {
  setAppTheme(appStore.appTheme)

  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`)
    if (res.ok) {
      const data = await res.json() as { tag_name: string; html_url: string }
      const latest = data.tag_name.replace(/^v/, '')
      if (latest !== CURRENT_VERSION) {
        appStore.updateAvailable = { version: `v${latest}`, url: data.html_url }
      }
    }
  } catch {
    // silently ignore
  }
})
</script>

<template>
  <div class="app-root" :data-theme="appStore.appTheme">
    <div v-if="appStore.view === 'home'" class="home-screen-wrapper">
      <ResumeList />
    </div>

    <div v-else class="app-layout">
      <Toolbar />
      <div class="editor-layout">
        <EditorPane
          ref="editorPaneRef"
          :on-editor-scroll="onEditorScroll"
          @content-change="onContentChange"
        />
        <PreviewPane
          ref="previewPaneRef"
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
</style>
