import { ref, computed, onUnmounted, type Ref } from "vue";

const SPLIT_KEY = "humbleresume-pane-split";

export function usePaneResize(layoutRef: Ref<HTMLElement | null>) {
  const splitPercent = ref(Number(localStorage.getItem(SPLIT_KEY)) || 50);

  const editorFlex = computed(() => splitPercent.value);
  const previewFlex = computed(() => 100 - splitPercent.value);

  function clamp(min: number, max: number, value: number): number {
    return Math.min(max, Math.max(min, value));
  }

  let activeController: AbortController | null = null;

  function startDrag(e: PointerEvent) {
    document.body.style.userSelect = "none";
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const dragRect = layoutRef.value?.getBoundingClientRect() ?? null;
    const isVertical = window.innerWidth <= 900;
    const total = isVertical ? dragRect?.height ?? 0 : dragRect?.width ?? 0;
    const minPct = (20 / total) * 100;

    function onPointerMove(e: PointerEvent) {
      if (!dragRect) return;
      const offset = isVertical ? e.clientY - dragRect.top : e.clientX - dragRect.left;
      splitPercent.value = clamp(minPct, 100 - minPct, (offset / total) * 100);
    }

    activeController = new AbortController();
    const { signal } = activeController;

    function stopDrag(e: PointerEvent) {
      document.body.style.userSelect = "";
      el.releasePointerCapture(e.pointerId);
      activeController?.abort();
      activeController = null;
      localStorage.setItem(SPLIT_KEY, String(splitPercent.value));
    }

    el.addEventListener("pointermove", onPointerMove, { signal });
    el.addEventListener("pointerup", stopDrag, { signal });
    el.addEventListener("pointercancel", stopDrag, { signal });
  }

  onUnmounted(() => {
    if (activeController) {
      activeController.abort();
      activeController = null;
      document.body.style.userSelect = "";
    }
  });

  function resetSplit() {
    splitPercent.value = 50;
    localStorage.setItem(SPLIT_KEY, "50");
  }

  return { editorFlex, previewFlex, startDrag, resetSplit };
}
