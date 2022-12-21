import {
  normalizeIndent,
  TemplateStringProps,
  templateStrPropsToStr,
} from "./strings.js";
import { tssToCss } from "./tss.js";

/**
 * A lightweight alternative to emotion
 *
 * @param templateString css - to be transpiled and injected
 * @returns a unique class name
 */
export function css(...props: TemplateStringProps) {
  const _css = templateStrPropsToStr(...props);
  return transpileAndAddToDom(_css);
}

/**
 * Enqueus css to be added to dom
 */
export function addToDom(css: string) {
  addToDom.queue.add(css);
  setTimeout(() => {
    if (addToDom.queue.size) {
      const css = [...addToDom.queue].join("\n");
      addToDom.queue.clear();
      let style = document.getElementById(
        "styled-components-lite"
      ) as HTMLStyleElement;
      if (!style) {
        style = document.createElement("style");
        style.id = "styled-components-lite";
        style.innerHTML = addToDom.baseCss + css;
        document.head.appendChild(style);
      } else {
        style.innerHTML += css;
      }
    }
  }, 0);
}
addToDom.queue = new Set();

addToDom.baseCss = `
.container {
	container-type: inline-size;
}
`;

/**
 * Injects css/tss to the page if they don't already exist and creates unique class names
 *
 * @param tss - css or tss to be transpiled and injected. :root is replaced by a unique class
 * @returns a unique class name
 *
 * tss is a superset of css
 * - tab based closure (i.e. replaces indentation with { and })
 *
 * Returns the unique class name
 */
export function transpileAndAddToDom(_css: string) {
  let root = transpileAndAddToDom.history.get(_css);
  if (!root) {
    root = "s" + transpileAndAddToDom.count++;
    transpileAndAddToDom.history.set(_css, root);
    _css = _css.replace(/:root/g, "." + root);
    _css = transpileAndAddToDom.transpilers.reduce((css, f) => f(css), _css);
    addToDom(_css);
  }
  return root;
}
transpileAndAddToDom.count = 0;
transpileAndAddToDom.history = new Map<string, string>();
transpileAndAddToDom.transpilers = [normalizeIndent, tssToCss];

export function classJoin(...classes: any[]) {
  return classes.filter((c) => c && typeof c === "string").join(" ");
}

// delete css comments i.e. {/* blah */}
export function deleteComments(css: string) {
  return css.replace(/{\/\*[\s\S]*?(?=\*\/})\*\/}/gm, "");
}
