/** Trims excessive prefixed indents */
export function normalizeIndent(str: string) {
  let out = str;
  out = out.replace(/ {2}/g, "\t");
  if (out.includes("\n")) {
    const lines = out.split("\n");
    const indentMin = lines[1].match(/\t/g)?.length ?? 0;
    out = lines.map((l) => l.slice(indentMin)).join("\n");
  }
  return out;
}

/**
 * Assemble a template string from a template string array and a list of placeholders.
 *
 * i.e.
 * myFoo(...props: TemplateStringProps) => {
 *  const inputStr = templateStrPropsToStr(...props);
 * }
 */
export function templateStrPropsToStr(
  strings: TemplateStringsArray,
  ...placeHolders: string[]
) {
  return strings.map((s, i) => s + (placeHolders?.[i] ?? "")).join("");
}
export type TemplateStringProps = [
  strings: TemplateStringsArray,
  ...placeHolders: string[]
];
