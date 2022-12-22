/** Joins class names and filters out blanks */
export function classJoin(...classes: any[]) {
  return classes.filter((c) => c && typeof c === "string").join(" ");
}

/** Ensure the number of open '{' equals the number of closed '}' */
export function closeUnclosed(css: string) {
  const opens = css.split("{").length - 1;
  let closes = css.split("}").length - 1;

  if (opens === closes) return css;

  // if there are more '{' than '}' then add the missing '}' to the end
  let fixed = css;
  while (opens > closes) {
    fixed += "}";
    closes++;
  }
  return fixed;
}

// delete css comments i.e. {/* blah */}
export function deleteComments(css: string) {
  return css.replace(/{\/\*[\s\S]*?(?=\*\/})\*\/}/gm, "");
}

/** Trims excessive prefixed indents */
export function normalizeIndent(css: string) {
  let out = css;
  out = out.replace(/ {2}/g, "\t");
  if (out.includes("\n")) {
    const lines = out.split("\n");
    const indentMin = lines[1].match(/\t/g)?.length ?? 0;
    out = lines.map((l) => l.slice(indentMin)).join("\n");
  }
  return out;
}

/**
 * Assemble a string from a template string array and a list of placeholders.
 *
 * - If the first argument is a string, it is returned as is.
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
