import {
  appStore,
  type TemplateName,
  persistSettings,
} from "../stores/appStore";

import modernCss from "../templates/modern/style.css?raw";
import minimalCss from "../templates/minimal/style.css?raw";
import academicCss from "../templates/academic/style.css?raw";

import modernStarter from "../templates/modern/starter.md?raw";
import minimalStarter from "../templates/minimal/starter.md?raw";
import academicStarter from "../templates/academic/starter.md?raw";

const templateCssMap: Record<TemplateName, string> = {
  modern: modernCss,
  minimal: minimalCss,
  academic: academicCss,
};

export const starterContent: Record<TemplateName, string> = {
  modern: modernStarter,
  minimal: minimalStarter,
  academic: academicStarter,
};

export function getTemplateCss(name: TemplateName): string {
  return templateCssMap[name];
}

export function setTemplate(name: TemplateName) {
  appStore.templateName = name;
  persistSettings();
}

export function setAppTheme(theme: "light" | "dark") {
  appStore.appTheme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  persistSettings();
}
