<script setup lang="ts">
import { computed } from "vue";
import { appStore, removeRecentFile } from "../stores/appStore";
import { useFileSystem } from "../composables/useFileSystem";
import { setTemplate, starterContent } from "../services/theme";
import type { TemplateName } from "../stores/appStore";

const { openFile, newFile } = useFileSystem();

const recentFiles = computed(() =>
  [...appStore.recentFiles].sort((a, b) => b.lastOpened - a.lastOpened),
);

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function startNew() {
  newFile(starterContent);
}

function removeRecent(path: string, e: MouseEvent) {
  e.stopPropagation();
  removeRecentFile(path);
}

const templates: { key: TemplateName; label: string; desc: string }[] = [
  {
    key: "modern",
    label: "Modern",
    desc: "Clean, blue accents, bold sections",
  },
  {
    key: "minimal",
    label: "Minimal",
    desc: "Simple, no-frills, high contrast",
  },
  { key: "academic", label: "Academic", desc: "Serif font, CV-style layout" },
];
</script>

<template>
  <div class="home-screen">
    <div class="home-header">
      <h1 class="logo-text">HumbleResume</h1>
      <p class="tagline">Write your resume in Markdown. Export as PDF.</p>
    </div>

    <div class="section">
      <h2 class="section-label">Choose a template</h2>
      <div class="template-grid">
        <button
          v-for="t in templates"
          :key="t.key"
          class="template-card"
          :class="{ active: appStore.templateName === t.key }"
          @click="setTemplate(t.key)"
        >
          <span class="template-name">{{ t.label }}</span>
          <span class="template-desc">{{ t.desc }}</span>
        </button>
      </div>
    </div>

    <div class="action-row">
      <button class="btn-action btn-primary" @click="startNew">
        <span class="action-icon">+</span>
        New Resume
      </button>
      <button class="btn-action" @click="openFile()">
        <span class="action-icon">&#128194;</span>
        Open File
      </button>
    </div>

    <div v-if="recentFiles.length > 0" class="section">
      <h2 class="section-label">Recent Files</h2>
      <ul class="recent-list">
        <li
          v-for="file in recentFiles"
          :key="file.path"
          class="recent-item"
          @click="openFile(file.path)"
        >
          <span class="recent-icon">&#128196;</span>
          <div class="recent-info">
            <span class="recent-name">{{ file.name }}</span>
            <span class="recent-path">{{ file.path }}</span>
          </div>
          <span class="recent-date">{{ formatDate(file.lastOpened) }}</span>
          <button
            class="remove-btn"
            title="Remove from list"
            @click="removeRecent(file.path, $event)"
          >
            ✕
          </button>
        </li>
      </ul>
    </div>

    <p v-else class="empty-state">
      No recent files. Create a new resume to get started.
    </p>
  </div>
</template>

<style scoped>
.home-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 56px 24px 40px;
  gap: 36px;
  max-width: 700px;
  margin: 0 auto;
  width: 100%;
}

.home-header {
  text-align: center;
}

.logo-text {
  font-size: 2.4rem;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: -0.5px;
  margin-bottom: 8px;
}

.tagline {
  color: var(--text-muted);
  font-size: 1rem;
}

.section {
  width: 100%;
}

.section-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--text-muted);
  margin-bottom: 12px;
  display: block;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.template-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card-bg);
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.template-card:hover {
  border-color: var(--accent);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.template-card.active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--card-bg));
}

.template-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text);
}

.template-desc {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.action-row {
  display: flex;
  gap: 12px;
  width: 100%;
}

.btn-action {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text);
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition:
    background 0.15s,
    border-color 0.15s;
}

.btn-action:hover {
  background: var(--btn-hover);
  border-color: var(--accent);
}

.btn-action.btn-primary {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

.btn-action.btn-primary:hover {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
}

.action-icon {
  font-size: 1.1rem;
  line-height: 1;
}

.recent-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.1s;
}

.recent-item:hover {
  background: var(--hover-bg);
}

.recent-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.recent-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.recent-name {
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--text);
}

.recent-path {
  font-size: 0.72rem;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-date {
  font-size: 0.72rem;
  color: var(--text-muted);
  flex-shrink: 0;
}

.remove-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.7rem;
  opacity: 0;
  transition: opacity 0.1s;
  flex-shrink: 0;
}

.recent-item:hover .remove-btn {
  opacity: 1;
}

.empty-state {
  color: var(--text-muted);
  font-size: 0.875rem;
}
</style>
