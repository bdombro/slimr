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
export function tssToCss(_tss: string) {
  _tss = normalizeIndent(_tss);

  const istss = !_tss.match(/{[^\/]/); // match '{' without a /* (i.e. not a comment)
  if (!istss) return _tss;

  let lastIndent = 0;

  // delete css comments i.e. {/* blah */}
  _tss = _tss.replace(/{\/\*[\s\S]*?(?=\*\/})\*\/}/gm, "");

  let lines = _tss.split("\n");

  // trim end whitespace
  lines = lines.map((l) => l.trimEnd());

  // delete empty lines
  lines = lines.filter(
    (l, i) => l.trim() !== "" || i == 0 || i === lines.length - 1
  );

  // convert indentation to { and }
  lines.forEach((line, lineIndex) => {
    let currentIndent = 0;
    for (const char of line) {
      if (char === "\t") currentIndent++;
      else break;
    }

    if (lineIndex <= 1) {
      // ignore first two lines
    } else if (currentIndent === lastIndent) {
      if (!lines[lineIndex - 1].endsWith(",") && !line.endsWith(","))
        lines[lineIndex] += ";";
      // ignore if indent unchanged
    } else if (currentIndent > lastIndent) {
      lines[lineIndex - 1] = lines[lineIndex - 1] + "{";
    } else if (currentIndent < lastIndent) {
      lines[lineIndex - 1] = lines[lineIndex - 1] + ";";
      let closeCount = lastIndent - currentIndent;
      for (let ci = 0; ci < closeCount; ci++) {
        lines[lineIndex - 1] += `\n${"\t".repeat(closeCount - ci - 1)}}`;
      }
    }
    lastIndent = currentIndent;
  });

  _tss = lines.join("\n");

  return _tss;
}
