import { deleteComments } from "./css.js";
import { normalizeIndent } from "./strings.js";

/**
 * Converts a css shorthand (aka tss) to real css
 * - Treats indentation as indicator for '{' and '}'
 * - Auto-appends ';' to end of lines
 *
 * Assumptions/Reqs:
 * - No '{' or '}' allowed in tss
 * - starts and ends with a new-line (aka \n)
 * - Use \t or 2-space indents
 * - no css comments
 *
 * ex. `
 *	 .cool-class
 *		 display: none
 * `
 *
 * converts to `
 *	 .cool-class {
 *		 display: none;
 *	 }
 * `
 */
export function tssToCss(tss: string) {
  const isTss = !tss.match(/{[^\/]/); // match '{' without a /* (i.e. not a comment)
  if (!isTss) return tss;

  let css = tss;

  css = deleteComments(css);
  css = normalizeIndent(css);

  let lastIndent = 0;

  let lines = css.split("\n");

  // delete empty lines
  lines = lines.filter(
    (l, i) => l.trim() !== "" || i == 0 || i === lines.length - 1
  );

  // convert indentation to { and }
  lines.forEach((line, iLine) => {
    let currentIndent = 0;
    for (const char of line) {
      if (char === "\t") currentIndent++;
      else break;
    }

    if (iLine <= 1) {
      // ignore first two lines
    } else if (currentIndent === lastIndent) {
      // ignore if indent unchanged
    } else if (currentIndent > lastIndent) {
      lines[iLine - 1] = lines[iLine - 1] + "{";
    } else if (currentIndent < lastIndent) {
      let closeCount = lastIndent - currentIndent;
      for (let iC = 0; iC < closeCount; iC++) {
        lines[iLine - 1] += `\n${"\t".repeat(closeCount - iC - 1)}}`;
      }
    }
    lastIndent = currentIndent;
  });

  lines = lines.flatMap((l) => l.split("\n"));

  lines.forEach((line, iLine) => {
    if (
      line.trim() &&
      !line.endsWith("{") &&
      !line.endsWith("}") &&
      !line.endsWith(",")
    ) {
      lines[iLine] += ";";
    }
  });

  // add ; to end of declarations

  css = lines.join("\n");

  return css;
}
