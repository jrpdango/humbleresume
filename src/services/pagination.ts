import type { PageSize } from "../stores/appStore";

export function getPageClass(pageSize: PageSize): string {
  return pageSize === "A4" ? "page-a4" : "page-letter";
}

export function paginateHtml(html: string, pageSize: PageSize): string[] {
  const pageClass = getPageClass(pageSize);
  const buffer = document.createElement("div");
  buffer.className = `page ${pageClass}`;
  buffer.style.cssText =
    "position:fixed;left:-9999px;top:0;visibility:hidden;pointer-events:none";
  buffer.innerHTML = html;
  document.body.appendChild(buffer);

  const style = getComputedStyle(buffer);
  const paddingTop = parseFloat(style.paddingTop);
  const paddingBottom = parseFloat(style.paddingBottom);
  const contentHeight = buffer.offsetHeight - paddingTop - paddingBottom;
  const children = Array.from(buffer.children) as HTMLElement[];

  const result: string[] = [];

  for (const child of children) {
    const childTop = child.offsetTop - paddingTop;
    const pageIndex = Math.max(0, Math.floor(childTop / contentHeight));

    while (result.length <= pageIndex) result.push("");
    result[pageIndex] += child.outerHTML;
  }

  document.body.removeChild(buffer);
  return result.length > 0 ? result : [""];
}
