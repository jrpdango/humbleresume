import { ref } from "vue";
import { renderMarkdown } from "../services/markdown";
import { appStore } from "../stores/appStore";

export function usePreview() {
  const previewHtml = ref("");

  function update(content: string) {
    previewHtml.value = renderMarkdown(content);
  }

  function getPageClass(): string {
    return appStore.pageSize === "A4" ? "page-a4" : "page-letter";
  }

  return { previewHtml, update, getPageClass };
}
