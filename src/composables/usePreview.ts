import { ref } from "vue";
import { renderMarkdown } from "../services/markdown";
import { paginateHtml, getPageClass } from "../services/pagination";
import { appStore } from "../stores/appStore";

export function usePreview() {
  const pages = ref<string[]>([""]);

  function update(content: string) {
    pages.value = paginateHtml(renderMarkdown(content), appStore.pageSize);
  }

  return { pages, update, getPageClass: () => getPageClass(appStore.pageSize) };
}
