import type { Ref } from "vue";
import * as monaco from "monaco-editor";
import { appStore } from "../stores/appStore";

export function useCssEditor(
  containerRef: Ref<HTMLElement | null>,
  onContentChange: (css: string) => void,
) {
  let editor: monaco.editor.IStandaloneCodeEditor | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let changeDisposable: monaco.IDisposable | null = null;

  function initEditor() {
    if (!containerRef.value || editor) return;

    editor = monaco.editor.create(containerRef.value, {
      value: appStore.currentFile?.customCss ?? "",
      language: "css",
      theme: appStore.appTheme === "dark" ? "vs-dark" : "vs",
      wordWrap: "on",
      lineNumbers: "on",
      minimap: { enabled: false },
      fontSize: 14,
      fontFamily:
        "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      renderWhitespace: "selection",
    });

    changeDisposable = editor.onDidChangeModelContent(() => {
      const css = editor!.getValue();
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => onContentChange(css), 300);
    });
  }

  function setContent(css: string) {
    if (!editor) return;
    if (editor.getValue() === css) return;
    const pos = editor.getPosition();
    editor.setValue(css);
    if (pos) editor.setPosition(pos);
  }

  function setTheme(theme: "light" | "dark") {
    monaco.editor.setTheme(theme === "dark" ? "vs-dark" : "vs");
  }

  function dispose() {
    if (debounceTimer) clearTimeout(debounceTimer);
    changeDisposable?.dispose();
    editor?.dispose();
    editor = null;
  }

  return { initEditor, setContent, setTheme, dispose };
}
