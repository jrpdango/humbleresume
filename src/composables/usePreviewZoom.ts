import { ref, computed, onMounted, onUnmounted } from "vue";
import type { Ref } from "vue";

const MIN_ZOOM = 0.7;
const MAX_ZOOM = 2.0;
const STEP = 0.1;

function clampZoom(v: number) {
  return Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v)) * 10) / 10;
}

export function usePreviewZoom(containerRef: Ref<HTMLElement | null>) {
  const zoom = ref(1.0);
  const panMode = ref(false);
  const isDragging = ref(false);

  const zoomLabel = computed(() => `${Math.round(zoom.value * 100)}%`);
  const zoomWrapperStyle = computed(() => ({ zoom: zoom.value }));

  function zoomIn() {
    zoom.value = clampZoom(zoom.value + STEP);
  }

  function zoomOut() {
    zoom.value = clampZoom(zoom.value - STEP);
  }

  function togglePan() {
    panMode.value = !panMode.value;
    console.log(panMode.value);
  }

  // Pan state (not reactive — no need to re-render on these)
  let panStartX = 0;
  let panStartY = 0;
  let scrollStartX = 0;
  let scrollStartY = 0;

  function onWheel(e: WheelEvent) {
    if (!e.ctrlKey) return;
    e.preventDefault();
    e.deltaY < 0 ? zoomIn() : zoomOut();
  }

  function onPointerDown(e: PointerEvent) {
    if (!panMode.value || e.button !== 0) return;
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    panStartX = e.clientX;
    panStartY = e.clientY;
    scrollStartX = el.scrollLeft;
    scrollStartY = el.scrollTop;
    isDragging.value = true;
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDragging.value) return;
    const el = e.currentTarget as HTMLElement;
    el.scrollLeft = scrollStartX - (e.clientX - panStartX);
    el.scrollTop = scrollStartY - (e.clientY - panStartY);
  }

  function endDrag(e: PointerEvent) {
    if (!isDragging.value) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    isDragging.value = false;
  }

  onMounted(() => {
    const el = containerRef.value;
    if (el) el.addEventListener("wheel", onWheel, { passive: false });
  });

  onUnmounted(() => {
    const el = containerRef.value;
    if (el) el.removeEventListener("wheel", onWheel);
  });

  return {
    zoom,
    panMode,
    isDragging,
    zoomLabel,
    zoomWrapperStyle,
    zoomIn,
    zoomOut,
    togglePan,
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  };
}
