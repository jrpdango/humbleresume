/// <reference types="vite/client" />

declare module "markdown-it-deflist";

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
