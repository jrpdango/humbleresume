import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";

// Must be set before monaco-editor is imported anywhere
(
  window as Window & {
    MonacoEnvironment?: { getWorker: (_: string, __: string) => Worker };
  }
).MonacoEnvironment = {
  getWorker(_: string, __: string) {
    return new EditorWorker();
  },
};

import { createApp } from "vue";
import "./styles/base.css";
import "./styles/print.css";
import App from "./App.vue";

createApp(App).mount("#app");
