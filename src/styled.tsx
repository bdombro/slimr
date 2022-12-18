import {FunctionalComponent, h} from 'preact'
import {classJoin, css} from './css'
import {TemplateStringProps} from './strings'

export {css}

/**
 * A lightweight alternative to styled-components
 * @param function - a functional component to be styled; must accept a className prop
 * @returns a function that accepts a template string of css returns a functional component
 */
function styled<C extends FunctionalComponent<any>>(Component: C) {
	return (...cssProps: TemplateStringProps) =>
		(props: Parameters<C>[0]) =>
			<Component {...props} className={classJoin(css(...cssProps), props.className)} />
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
type Ref<T> = {current: T}
type Props<T extends HTMLElement> = h.JSX.HTMLAttributes<T> & {
	forwardRef?: Ref<T>
}

const tags = {
	/**
	 * Creates an 'a' tag with css styles
	 * @param templateString css - to be transpiled and injected
	 */
	a:
		(...props: TemplateStringProps) =>
		(p: Props<HTMLAnchorElement>) =>
			<a {...p} ref={p.forwardRef} className={classJoin(css(...props), p.className)} />,
	/**
	 * Creates an button tag with css styles
	 * @param templateString css - to be transpiled and injected
	 */
	button:
		(...props: TemplateStringProps) =>
		(p: Props<HTMLButtonElement>) =>
			<button {...p} ref={p.forwardRef} className={classJoin(css(...props), p.className)} />,
	/**
	 * Creates an div tag with css styles and container-type: inline-size
	 * @param templateString css - to be transpiled and injected
	 */
	container:
		(...props: TemplateStringProps) =>
		(p: Props<HTMLDivElement>) =>
			<div {...p} ref={p.forwardRef} className={classJoin(css(...props), p.className, 'container')} />,
	/**
	 * Creates an div tag with css styles
	 * @param templateString css - to be transpiled and injected
	 */
	div:
		(...props: TemplateStringProps) =>
		(p: Props<HTMLDivElement>) =>
			<div {...p} ref={p.forwardRef} className={classJoin(css(...props), p.className)} />,
	/**
	 * Creates an pre tag with css styles
	 * @param templateString css - to be transpiled and injected
	 */
	pre:
		(...props: TemplateStringProps) =>
		(p: Props<HTMLPreElement>) =>
			<pre {...p} ref={p.forwardRef} className={classJoin(css(...props), p.className)} />,
	/**
	 * Creates an img tag with css styles
	 * @param templateString css - to be transpiled and injected
	 */
	img:
		(...props: TemplateStringProps) =>
		(p: Props<HTMLImageElement>) =>
			<img {...p} ref={p.forwardRef} className={classJoin(css(...props), p.className)} />,
	/**
	 * Creates an form tag with css styles
	 * @param templateString css - to be transpiled and injected
	 */
	form:
		(...props: TemplateStringProps) =>
		(p: Props<HTMLFormElement>) =>
			<form {...p} ref={p.forwardRef} className={classJoin(css(...props), p.className)} />,
	/**
	 * Creates an input tag with css styles
	 * @param templateString css - to be transpiled and injected
	 */
	input:
		(...props: TemplateStringProps) =>
		(p: Props<HTMLInputElement>) =>
			<input {...p} ref={p.forwardRef} className={classJoin(css(...props), p.className)} />,
	/**
	 * Creates an label tag with css styles
	 * @param templateString css - to be transpiled and injected
	 */
	label:
		(...props: TemplateStringProps) =>
		(p: Props<HTMLLabelElement>) =>
			<label {...p} ref={p.forwardRef} className={classJoin(css(...props), p.className)} />,
	/**
	 * Creates an nav tag with css styles
	 * @param templateString css - to be transpiled and injected
	 */
	nav:
		(...props: TemplateStringProps) =>
		(p: Props<HTMLElement>) =>
			<nav {...p} ref={p.forwardRef} className={classJoin(css(...props), p.className)} />,
	/**
	 * Creates an p tag with css styles
	 * @param templateString css - to be transpiled and injected
	 */
	p:
		(...props: TemplateStringProps) =>
		(p: Props<HTMLParagraphElement>) =>
			<p {...p} ref={p.forwardRef} className={classJoin(css(...props), p.className)} />,
	/**
	 * Creates an span tag with css styles
	 * @param templateString css - to be transpiled and injected
	 */
	span:
		(...props: TemplateStringProps) =>
		(p: Props<HTMLSpanElement>) =>
			<span {...p} ref={p.forwardRef} className={classJoin(css(...props), p.className)} />,
	/**
	 * Creates an table tag with css styles
	 * @param templateString css - to be transpiled and injected
	 */
	table:
		(...props: TemplateStringProps) =>
		(p: Props<HTMLTableElement>) =>
			<table {...p} ref={p.forwardRef} className={classJoin(css(...props), p.className)} />,
	/**
	 * Creates an td tag with css styles
	 * @param templateString css - to be transpiled and injected
	 */
	td:
		(...props: TemplateStringProps) =>
		(p: Props<HTMLTableDataCellElement>) =>
			<td {...p} ref={p.forwardRef} className={classJoin(css(...props), p.className)} />,
	/**
	 * Creates an tr tag with css styles
	 * @param templateString css - to be transpiled and injected
	 */
	tr:
		(...props: TemplateStringProps) =>
		(p: Props<HTMLTableRowElement>) =>
			<tr {...p} ref={p.forwardRef} className={classJoin(css(...props), p.className)} />,
	/**
	 * Creates an textarea tag with css styles
	 * @param templateString css - to be transpiled and injected
	 */
	textarea:
		(...props: TemplateStringProps) =>
		(p: Props<HTMLTextAreaElement>) =>
			<textarea {...p} ref={p.forwardRef} className={classJoin(css(...props), p.className)} />,
}
/**
 * A no-frills div component with container-type: inline-size
 */
export const Container = tags.container``

export default Object.assign(styled, tags)
