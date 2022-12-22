/**
 * This file is identical to the react version (/packages/react/src/index.tsx) except for
 * - imports createElement(h) and types from React
 * - types are converted to react-agnostic, generic types at the bottom
 *
 * The guts should be kept 1-to-1 identical, so that it's easier to maintain
 */
import { FunctionalComponent as FC, h, JSX } from "preact";
import css, {
  classJoin,
  TemplateStringProps,
} from "@styled-components-lite/css";

export { classJoin, css };

/**
 * A lightweight alternative to styled-components
 * @param function - a functional component to be styled; must accept a className prop
 * @returns a function that accepts a template string of css returns a functional component
 */
function styled<C extends FC>(Component: C) {
  return (...cssProps: TemplateStringProps) => {
    const className = css(...cssProps);
    function CStyled(props: any) {
      const { forwardRef, ...rest } = props;
      return h(Component, {
        ref: forwardRef,
        ...rest,
        className: classJoin(className, props.className),
      });
    }
    CStyled.toString = () => "." + className;
    return CStyled as C;
  };
}

/**
 *
 *
 * Factories to quickly create elements with css styles
 *
 * @param css - a string or templateString to be transpiled and injected
 *
 *
 */
const tags = {
  /**
   * Creates an 'a' tag with css styles
   * @param css - a string or templateString to be transpiled and injected
   */
  a: (...props: TempSProps) => styled("a" as unk as P2C<Prims["a"]>)(...props),
  /**
   * Creates an button tag with css styles
   * @param css - a string or templateString to be transpiled and injected
   */
  button: (...props: TempSProps) =>
    styled("button" as unk as P2C<Prims["button"]>)(...props),
  /**
   * Creates an div tag with css styles
   * @param css - a string or templateString to be transpiled and injected
   */
  div: (...props: TempSProps) =>
    styled("div" as unk as P2C<Prims["div"]>)(...props),
  /**
   * Creates an pre tag with css styles
   * @param css - a string or templateString to be transpiled and injected
   */
  pre: (...props: TempSProps) =>
    styled("pre" as unk as P2C<Prims["pre"]>)(...props),
  /**
   * Creates an img tag with css styles
   * @param css - a string or templateString to be transpiled and injected
   */
  img: (...props: TempSProps) =>
    styled("img" as unk as P2C<Prims["img"]>)(...props),
  /**
   * Creates an form tag with css styles
   * @param css - a string or templateString to be transpiled and injected
   */
  form: (...props: TempSProps) =>
    styled("form" as unk as P2C<Prims["form"]>)(...props),
  /**
   * Creates an input tag with css styles
   * @param css - a string or templateString to be transpiled and injected
   */
  input: (...props: TempSProps) =>
    styled("input" as unk as P2C<Prims["input"]>)(...props),
  /**
   * Creates an label tag with css styles
   * @param css - a string or templateString to be transpiled and injected
   */
  label: (...props: TempSProps) =>
    styled("label" as unk as P2C<Prims["label"]>)(...props),
  /**
   * Creates an nav tag with css styles
   * @param css - a string or templateString to be transpiled and injected
   */
  nav: (...props: TempSProps) =>
    styled("nav" as unk as P2C<Prims["nav"]>)(...props),
  /**
   * Creates an p tag with css styles
   * @param css - a string or templateString to be transpiled and injected
   */
  p: (...props: TempSProps) => styled("p" as unk as P2C<Prims["p"]>)(...props),
  /**
   * Creates an span tag with css styles
   * @param css - a string or templateString to be transpiled and injected
   */
  span: (...props: TempSProps) =>
    styled("span" as unk as P2C<Prims["span"]>)(...props),
  /**
   * Creates an table tag with css styles
   * @param css - a string or templateString to be transpiled and injected
   */
  table: (...props: TempSProps) =>
    styled("table" as unk as P2C<Prims["table"]>)(...props),
  /**
   * Creates an td tag with css styles
   * @param css - a string or templateString to be transpiled and injected
   */
  td: (...props: TempSProps) =>
    styled("td" as unk as P2C<Prims["td"]>)(...props),
  /**
   * Creates an tr tag with css styles
   * @param css - a string or templateString to be transpiled and injected
   */
  tr: (...props: TempSProps) =>
    styled("tr" as unk as P2C<Prims["tr"]>)(...props),
  /**
   * Creates an textarea tag with css styles
   * @param css - a string or templateString to be transpiled and injected
   */
  textarea: (...props: TempSProps) =>
    styled("textarea" as unk as P2C<Prims["textarea"]>)(...props),
};

export default Object.assign(styled, tags);

type Ref<T> = { current: T };
type PrimitiveProps<T extends HTMLElement> = JSX.HTMLAttributes<T> & {
  forwardRef?: Ref<T>;
};
/** Primitive to component */
type P2C<T extends HTMLElement> = (props: PrimitiveProps<T>) => JSX.Element;
/** Shorthand type */
type unk = unknown;
/** Shorthand type */
type TempSProps = TemplateStringProps;

interface Prims {
  a: HTMLAnchorElement;
  button: HTMLButtonElement;
  div: HTMLDivElement;
  pre: HTMLPreElement;
  img: HTMLImageElement;
  form: HTMLFormElement;
  input: HTMLInputElement;
  label: HTMLLabelElement;
  nav: HTMLElement;
  p: HTMLParagraphElement;
  span: HTMLSpanElement;
  table: HTMLTableElement;
  td: HTMLTableDataCellElement;
  tr: HTMLTableRowElement;
  textarea: HTMLTextAreaElement;
}
