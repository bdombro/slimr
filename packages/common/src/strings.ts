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
 * Assemble a string from a string or template string array and a list of placeholders.
 *
 * i.e.
 * myFoo(...props: TemplateStringProps) => {
 *  const inputStr = templateStrPropsToStr(...props);
 * }
 * myFoo`hello ${name}` => 'hello world'
 * myFoo(`hello ${name}`) => 'hello world'
 */
export function templateStrPropsToStr(...props: TemplateStringProps) {
  const [strings, ...placeHolders] = props;
  const str =
    typeof strings === "string"
      ? strings
      : strings.map((s, i) => s + (placeHolders?.[i] ?? "")).join("");
  return str;
}
export type TemplateStringProps = [
  strings: TemplateStringsArray | string,
  ...placeHolders: string[]
];
