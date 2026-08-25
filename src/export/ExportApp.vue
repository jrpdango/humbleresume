<script setup lang="ts">
import { ref, onMounted } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { renderMarkdown } from "../services/markdown";
import { paginateHtml, getPageClass } from "../services/pagination";
import type { PageSize } from "../stores/appStore";
import "katex/dist/katex.min.css";
import "./export.css";

interface ExportPayload {
  content: string;
  css: string;
  pageSize: PageSize;
}

const pages = ref<string[]>([""]);
const pageClass = ref("page-a4");
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const payload = await invoke<ExportPayload | null>("get_export_payload");
    if (!payload) throw new Error("no export payload available");

    const cssEl = document.createElement("style");
    cssEl.textContent = payload.css;
    document.head.appendChild(cssEl);

    const pageEl = document.createElement("style");
    pageEl.textContent = `@page { size: ${payload.pageSize === "A4" ? "A4" : "letter"}; margin: 0; }`;
    document.head.appendChild(pageEl);

    pageClass.value = getPageClass(payload.pageSize);
    pages.value = paginateHtml(
      renderMarkdown(payload.content),
      payload.pageSize,
    );

    await document.fonts.ready;
    await new Promise((resolve) => setTimeout(resolve, 100));

    await invoke("export_ready");
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
    invoke("export_failed", { message: error.value }).catch(() => {});
  }
});
</script>

<template>
  <div class="export-pages">
    <div v-if="error" class="export-error">{{ error }}</div>
    <div
      v-for="(pageHtml, i) in pages"
      :key="i"
      class="page"
      :class="pageClass"
      v-html="pageHtml"
    />
  </div>
</template>
