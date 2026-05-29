import { ref, computed, type Ref } from "vue";

const SPLIT_KEY = "humbleresume-pane-split";

export function usePaneResize(layoutRef: Ref<HTMLElement | null>) {
  const splitPercent = ref(Number(localStorage.getItem(SPLIT_KEY)) || 50);

  const editorFlex = computed(() => splitPercent.value);
  const previewFlex = computed(() => 100 - splitPercent.value);

  function clamp(min: number, max: number, value: number): number {
    return Math.min(max, Math.max(min, value));
  }

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

    function stopDrag(e: PointerEvent) {
      document.body.style.userSelect = "";
      el.releasePointerCapture(e.pointerId);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", stopDrag);
      el.removeEventListener("pointercancel", stopDrag);
      localStorage.setItem(SPLIT_KEY, String(splitPercent.value));
    }

    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", stopDrag);
    el.addEventListener("pointercancel", stopDrag);
  }

  function resetSplit() {
    splitPercent.value = 50;
    localStorage.setItem(SPLIT_KEY, "50");
  }

  return { editorFlex, previewFlex, startDrag, resetSplit };
}
