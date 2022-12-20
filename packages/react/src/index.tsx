import React from "react";
import {
  classJoin,
  css,
  TemplateStringProps,
} from "@styled-components-lite/common";

export { classJoin, css };

/**
 * A lightweight alternative to styled-components
 * @param function - a functional component to be styled; must accept a className prop
 * @returns a function that accepts a template string of css returns a functional component
 */
function styled<C extends React.FC<any>>(Component: C) {
  return (...cssProps: TemplateStringProps) =>
    (props: Parameters<C>[0]) =>
      (
        <Component
          {...props}
          className={classJoin(css(...cssProps), props.className)}
        />
      );
}

/**
 *
 *
 * Factories to quickly create elements with css styles
 *
 * @param templateString css - to be transpiled and injected
 *
 *
 */
type Ref<T> = { current: T };
type ExtraProps = {
  forwardRef?: React.RefObject<any>;
};
type SProps<T extends React.DetailedHTMLProps<any, any>> = T & ExtraProps;
type Elems = JSX.IntrinsicElements;

// React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>

const tags = {
  /**
   * Creates an 'a' tag with css styles
   * @param templateString css - to be transpiled and injected
   */
  a: (...props: TemplateStringProps) =>
    React.forwardRef<HTMLAnchorElement, Elems["a"]>((p, ref) => (
      <a {...p} ref={ref} className={classJoin(css(...props), p.className)} />
    )),
  /**
   * Creates an button tag with css styles
   * @param templateString css - to be transpiled and injected
   */
  button: (...props: TemplateStringProps) =>
    React.forwardRef<HTMLButtonElement, Elems["button"]>((p, ref) => (
      <button
        {...p}
        ref={ref}
        className={classJoin(css(...props), p.className)}
      />
    )),
  /**
   * Creates an div tag with css styles and container-type: inline-size
   * @param templateString css - to be transpiled and injected
   */
  container: (...props: TemplateStringProps) =>
    React.forwardRef<HTMLDivElement, Elems["div"]>((p, ref) => (
      <div
        {...p}
        ref={ref}
        className={classJoin(css(...props), p.className, "container")}
      />
    )),
  /**
   * Creates an div tag with css styles
   * @param templateString css - to be transpiled and injected
   */
  div: (...props: TemplateStringProps) =>
    React.forwardRef<HTMLDivElement, Elems["div"]>((p, ref) => (
      <div {...p} ref={ref} className={classJoin(css(...props), p.className)} />
    )),
  /**
   * Creates an pre tag with css styles
   * @param templateString css - to be transpiled and injected
   */
  pre: (...props: TemplateStringProps) =>
    React.forwardRef<HTMLPreElement, Elems["pre"]>((p, ref) => (
      <pre {...p} ref={ref} className={classJoin(css(...props), p.className)} />
    )),
  /**
   * Creates an img tag with css styles
   * @param templateString css - to be transpiled and injected
   */
  img: (...props: TemplateStringProps) =>
    React.forwardRef<HTMLImageElement, Elems["img"]>((p, ref) => (
      <img {...p} ref={ref} className={classJoin(css(...props), p.className)} />
    )),
  /**
   * Creates an form tag with css styles
   * @param templateString css - to be transpiled and injected
   */
  form: (...props: TemplateStringProps) =>
    React.forwardRef<HTMLFormElement, Elems["form"]>((p, ref) => (
      <form
        {...p}
        ref={ref}
        className={classJoin(css(...props), p.className)}
      />
    )),
  /**
   * Creates an input tag with css styles
   * @param templateString css - to be transpiled and injected
   */
  input: (...props: TemplateStringProps) =>
    React.forwardRef<HTMLInputElement, Elems["input"]>((p, ref) => (
      <input
        {...p}
        ref={ref}
        className={classJoin(css(...props), p.className)}
      />
    )),
  /**
   * Creates an label tag with css styles
   * @param templateString css - to be transpiled and injected
   */
  label: (...props: TemplateStringProps) =>
    React.forwardRef<HTMLLabelElement, Elems["label"]>((p, ref) => (
      <label
        {...p}
        ref={ref}
        className={classJoin(css(...props), p.className)}
      />
    )),
  /**
   * Creates an nav tag with css styles
   * @param templateString css - to be transpiled and injected
   */
  nav: (...props: TemplateStringProps) =>
    React.forwardRef<HTMLElement, Elems["nav"]>((p, ref) => (
      <nav {...p} ref={ref} className={classJoin(css(...props), p.className)} />
    )),
  /**
   * Creates an p tag with css styles
   * @param templateString css - to be transpiled and injected
   */
  p: (...props: TemplateStringProps) =>
    React.forwardRef<HTMLParagraphElement, Elems["p"]>((p, ref) => (
      <p {...p} ref={ref} className={classJoin(css(...props), p.className)} />
    )),
  /**
   * Creates an span tag with css styles
   * @param templateString css - to be transpiled and injected
   */
  span: (...props: TemplateStringProps) =>
    React.forwardRef<HTMLSpanElement, Elems["span"]>((p, ref) => (
      <span
        {...p}
        ref={ref}
        className={classJoin(css(...props), p.className)}
      />
    )),
  /**
   * Creates an table tag with css styles
   * @param templateString css - to be transpiled and injected
   */
  table: (...props: TemplateStringProps) =>
    React.forwardRef<HTMLTableElement, Elems["table"]>((p, ref) => (
      <table
        {...p}
        ref={ref}
        className={classJoin(css(...props), p.className)}
      />
    )),
  /**
   * Creates an td tag with css styles
   * @param templateString css - to be transpiled and injected
   */
  td: (...props: TemplateStringProps) =>
    React.forwardRef<HTMLTableDataCellElement, Elems["td"]>((p, ref) => (
      <td {...p} ref={ref} className={classJoin(css(...props), p.className)} />
    )),
  /**
   * Creates an tr tag with css styles
   * @param templateString css - to be transpiled and injected
   */
  tr: (...props: TemplateStringProps) =>
    React.forwardRef<HTMLTableRowElement, Elems["tr"]>((p, ref) => (
      <tr {...p} ref={ref} className={classJoin(css(...props), p.className)} />
    )),
  /**
   * Creates an textarea tag with css styles
   * @param templateString css - to be transpiled and injected
   */
  textarea: (...props: TemplateStringProps) =>
    React.forwardRef<HTMLTextAreaElement, Elems["textarea"]>((p, ref) => (
      <textarea
        {...p}
        ref={ref}
        className={classJoin(css(...props), p.className)}
      />
    )),
};
/**
 * A no-frills div component with container-type: inline-size
 */
export const Container = tags.container``;

export default Object.assign(styled, tags);
