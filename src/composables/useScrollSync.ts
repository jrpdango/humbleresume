export function useScrollSync() {
  let isSyncing = false

  function syncEditorToPreview(
    editorScrollTop: number,
    editorScrollHeight: number,
    editorClientHeight: number,
    previewEl: HTMLElement,
  ) {
    if (isSyncing) return
    const range = editorScrollHeight - editorClientHeight
    if (range <= 0) return
    isSyncing = true
    const ratio = editorScrollTop / range
    previewEl.scrollTop = ratio * (previewEl.scrollHeight - previewEl.clientHeight)
    requestAnimationFrame(() => { isSyncing = false })
  }

  function syncPreviewToEditor(
    previewScrollTop: number,
    previewScrollHeight: number,
    previewClientHeight: number,
    setEditorScroll: (ratio: number) => void,
  ) {
    if (isSyncing) return
    const range = previewScrollHeight - previewClientHeight
    if (range <= 0) return
    isSyncing = true
    const ratio = previewScrollTop / range
    setEditorScroll(ratio)
    requestAnimationFrame(() => { isSyncing = false })
  }

  return { syncEditorToPreview, syncPreviewToEditor }
}
