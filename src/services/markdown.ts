import MarkdownIt from "markdown-it";
import mk from "@traptitech/markdown-it-katex";
import deflist from "markdown-it-deflist";

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
})
  .use(mk, { throwOnError: false, errorColor: "#cc0000" })
  .use(deflist);

const origParagraphOpen = md.renderer.rules.paragraph_open;

md.renderer.rules.paragraph_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  if (token.map) token.attrSet("data-line", String(token.map[0]));
  return origParagraphOpen
    ? origParagraphOpen(tokens, idx, options, env, self)
    : self.renderToken(tokens, idx, options);
};

export function renderMarkdown(content: string): string {
  return md.render(content);
}
