import type { Ref } from 'vue'
import * as monaco from 'monaco-editor'
import { appStore } from '../stores/appStore'

export function useEditor(
  containerRef: Ref<HTMLElement | null>,
  onContentChange: (content: string) => void,
  onScrollChange: (scrollTop: number, scrollHeight: number, clientHeight: number) => void,
) {
  let editor: monaco.editor.IStandaloneCodeEditor | null = null
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let changeDisposable: monaco.IDisposable | null = null
  let scrollDisposable: monaco.IDisposable | null = null

  function initEditor() {
    if (!containerRef.value || editor) return

    editor = monaco.editor.create(containerRef.value, {
      value: appStore.currentFile?.content ?? '',
      language: 'markdown',
      theme: appStore.appTheme === 'dark' ? 'vs-dark' : 'vs',
      wordWrap: 'on',
      lineNumbers: 'on',
      minimap: { enabled: false },
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      renderWhitespace: 'selection',
    })

    changeDisposable = editor.onDidChangeModelContent(() => {
      const content = editor!.getValue()
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => onContentChange(content), 300)
    })

    scrollDisposable = editor.onDidScrollChange((e) => {
      const layout = editor!.getLayoutInfo()
      onScrollChange(e.scrollTop, e.scrollHeight, layout.height)
    })
  }

  function setContent(content: string) {
    if (!editor) return
    if (editor.getValue() === content) return
    const pos = editor.getPosition()
    editor.setValue(content)
    if (pos) editor.setPosition(pos)
  }

  function setTheme(theme: 'light' | 'dark') {
    monaco.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'vs')
  }

  function setScrollByRatio(ratio: number) {
    if (!editor) return
    const scrollHeight = editor.getScrollHeight()
    const layoutHeight = editor.getLayoutInfo().height
    editor.setScrollTop(ratio * (scrollHeight - layoutHeight))
  }

  function dispose() {
    if (debounceTimer) clearTimeout(debounceTimer)
    changeDisposable?.dispose()
    scrollDisposable?.dispose()
    editor?.dispose()
    editor = null
  }

  return { initEditor, setContent, setTheme, setScrollByRatio, dispose }
}
