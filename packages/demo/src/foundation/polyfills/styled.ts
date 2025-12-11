import * as _styled from "@slimr/react"
import { classJoin } from "@slimr/react"

declare global {
	var addCss: typeof _styled.addCss
	var styled: typeof _styled.styled

	// Styled primitives

	/** A styled 'a' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var A: typeof _styled.A
	/** A styled 'abbr' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Abbr: typeof _styled.Abbr
	/** A styled 'address' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Address: typeof _styled.Address
	/** A styled 'area' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Area: typeof _styled.Area
	/** A styled 'article' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Article: typeof _styled.Article
	/** A styled 'aside' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Aside: typeof _styled.Aside
	/** A styled 'audio' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var AudioC: typeof _styled.AudioC
	/** A styled 'b' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var B: typeof _styled.B
	/** A styled 'blockquote' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Blockquote: typeof _styled.Blockquote
	/** A styled 'br' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Br: typeof _styled.Br
	/** A styled 'button' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Button: typeof _styled.Button
	/** A styled 'caption' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Caption: typeof _styled.Caption
	/** A styled 'cite' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Cite: typeof _styled.Cite
	/** A styled 'code' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Code: typeof _styled.Code
	/** A styled 'col' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Col: typeof _styled.Col
	/** A styled 'colgroup' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Colgroup: typeof _styled.Colgroup
	/** A styled 'dd' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Dd: typeof _styled.Dd
	/** A styled 'del' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Del: typeof _styled.Del
	/** A styled 'details' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Details: typeof _styled.Details
	/** A styled 'dfn' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Dfn: typeof _styled.Dfn
	/** A styled 'dialog' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Dialog: typeof _styled.Dialog
	/** A styled 'div' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Div: typeof _styled.Div
	/** A styled 'dl' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Dl: typeof _styled.Dl
	/** A styled 'dt' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Dt: typeof _styled.Dt
	/** A styled 'em' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Em: typeof _styled.Em
	/** A styled 'embed' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Embed: typeof _styled.Embed
	/** A styled 'fieldset' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Fieldset: typeof _styled.Fieldset
	/** A styled 'figcaption' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Figcaption: typeof _styled.Figcaption
	/** A styled 'figure' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Figure: typeof _styled.Figure
	/** A styled 'footer' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Footer: typeof _styled.Footer
	/** A styled 'form' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	// var Form: typeof _styled.Form
	/** A styled 'h1' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var H1: typeof _styled.H1
	/** A styled 'h2' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var H2: typeof _styled.H2
	/** A styled 'h3' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var H3: typeof _styled.H3
	/** A styled 'h4' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var H4: typeof _styled.H4
	/** A styled 'h5' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var H5: typeof _styled.H5
	/** A styled 'h6' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var H6: typeof _styled.H6
	/** A styled 'header' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Header: typeof _styled.Header
	/** A styled 'hgroup' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Hgroup: typeof _styled.Hgroup
	/** A styled 'hr' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Hr: typeof _styled.Hr
	/** A styled 'i' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var I: typeof _styled.I
	/** A styled 'iframe' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Iframe: typeof _styled.Iframe
	/** A styled 'img' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Img: typeof _styled.Img
	/** A styled 'input' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	// var Input: typeof _styled.Input
	/** A styled 'ins' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Ins: typeof _styled.Ins
	/** A styled 'kbd' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Kbd: typeof _styled.Kbd
	/** A styled 'label' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Label: typeof _styled.Label
	/** A styled 'legend' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Legend: typeof _styled.Legend
	/** A styled 'li' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Li: typeof _styled.Li
	/** A styled 'main' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Main: typeof _styled.Main
	/** A styled 'map' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var MapC: typeof _styled.MapC
	/** A styled 'mark' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Mark: typeof _styled.Mark
	/** A styled 'meter' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Meter: typeof _styled.Meter
	/** A styled 'nav' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Nav: typeof _styled.Nav
	/** A styled 'object' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var ObjectC: typeof _styled.ObjectC
	/** A styled 'ol' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Ol: typeof _styled.Ol
	/** A styled 'optgroup' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Optgroup: typeof _styled.Optgroup
	/** A styled 'option' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	// var OptionC: typeof _styled.OptionC
	/** A styled 'output' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Output: typeof _styled.Output
	/** A styled 'p' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var P: typeof _styled.P
	/** A styled 'picture' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Picture: typeof _styled.Picture
	/** A styled 'pre' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Pre: typeof _styled.Pre
	/** A styled 'progress' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Progress: typeof _styled.Progress
	/** A styled 'q' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Q: typeof _styled.Q
	/** A styled 'rp' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Rp: typeof _styled.Rp
	/** A styled 'rt' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Rt: typeof _styled.Rt
	/** A styled 'ruby' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Ruby: typeof _styled.Ruby
	/** A styled 's' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var S: typeof _styled.S
	/** A styled 'samp' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Samp: typeof _styled.Samp
	/** A styled 'section' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Section: typeof _styled.Section
	/** A styled 'select' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	// var Select: typeof _styled.Select
	/** A styled 'small' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Small: typeof _styled.Small
	/** A styled 'span' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Span: typeof _styled.Span
	/** A styled 'strong' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Strong: typeof _styled.Strong
	/** A styled 'sub' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Sub: typeof _styled.Sub
	/** A styled 'summary' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Summary: typeof _styled.Summary
	/** A styled 'sup' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Sup: typeof _styled.Sup
	/** A styled 'svg' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Svg: typeof _styled.Svg
	/** A styled 'table' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Table: typeof _styled.Table
	/** A styled 'tbody' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Tbody: typeof _styled.Tbody
	/** A styled 'td' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Td: typeof _styled.Td
	/** A styled 'textarea' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	// var Textarea: typeof _styled.Textarea
	/** A styled 'tfoot' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Tfoot: typeof _styled.Tfoot
	/** A styled 'th' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Th: typeof _styled.Th
	/** A styled 'thead' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Thead: typeof _styled.Thead
	/** A styled 'time' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Time: typeof _styled.Time
	/** A styled 'tr' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Tr: typeof _styled.Tr
	/** A styled 'u' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var U: typeof _styled.U
	/** A styled 'ul' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Ul: typeof _styled.Ul
	/** A styled 'video' tag with nice styled magic, like _style props, zx, css, and style short-hands  */
	var Video: typeof _styled.Video
	/** A styled 'div' tag with d=flex and nice styled magic, like _style props, zx, css, and style short-hands  */
	var Flex: typeof _styled.Flex
	/** A styled 'div' tag with d=flex, flexDirection=column, and nice styled magic, like _style props, zx, css, and style short-hands  */
	var FlexC: typeof _styled.FlexC
}

globalThis.addCss = _styled.addCss
globalThis.styled = _styled.styled

globalThis.A = (p: _styled.AProps) => {
	let isActive = false
	if (!p.href || p.href.startsWith("#")) {
		// do nothing
	} else {
		const pathRelative = new URL(p.href!, location.href).pathname
		isActive = location.pathname === pathRelative
	}
	return (_styled.A as sany).render({
		...p,
		className: classJoin(p.className, isActive ? "active" : ""),
	})
}
globalThis.Abbr = _styled.Abbr
globalThis.Address = _styled.Address
globalThis.Area = _styled.Area
globalThis.Article = _styled.Article
globalThis.Aside = _styled.Aside
globalThis.AudioC = _styled.AudioC
globalThis.B = _styled.B
globalThis.Blockquote = _styled.Blockquote
globalThis.Br = _styled.Br
globalThis.Button = _styled.Button
globalThis.Caption = _styled.Caption
globalThis.Cite = _styled.Cite
globalThis.Code = _styled.Code
globalThis.Col = _styled.Col
globalThis.Colgroup = _styled.Colgroup
globalThis.Dd = _styled.Dd
globalThis.Del = _styled.Del
globalThis.Details = _styled.Details
globalThis.Dfn = _styled.Dfn
globalThis.Dialog = _styled.Dialog
globalThis.Div = _styled.Div
globalThis.Dl = _styled.Dl
globalThis.Dt = _styled.Dt
globalThis.Em = _styled.Em
globalThis.Embed = _styled.Embed
globalThis.Fieldset = _styled.Fieldset
globalThis.Figcaption = _styled.Figcaption
globalThis.Figure = _styled.Figure
globalThis.Footer = _styled.Footer
// globalThis.Form = _styled.Form
globalThis.H1 = _styled.H1
globalThis.H2 = _styled.H2
globalThis.H3 = _styled.H3
globalThis.H4 = _styled.H4
globalThis.H5 = _styled.H5
globalThis.H6 = _styled.H6
globalThis.Header = _styled.Header
globalThis.Hgroup = _styled.Hgroup
globalThis.Hr = _styled.Hr
globalThis.I = _styled.I
globalThis.Iframe = _styled.Iframe
globalThis.Img = _styled.Img
// globalThis.Input = _styled.Input
globalThis.Ins = _styled.Ins
globalThis.Kbd = _styled.Kbd
globalThis.Label = _styled.Label
globalThis.Legend = _styled.Legend
globalThis.Li = _styled.Li
globalThis.Main = _styled.Main
globalThis.MapC = _styled.MapC
globalThis.Mark = _styled.Mark
globalThis.Meter = _styled.Meter
globalThis.Nav = _styled.Nav
globalThis.ObjectC = _styled.ObjectC
globalThis.Ol = _styled.Ol
globalThis.Optgroup = _styled.Optgroup
// globalThis.OptionC = _styled.OptionC
globalThis.Output = _styled.Output
globalThis.P = _styled.P
globalThis.Picture = _styled.Picture
globalThis.Pre = _styled.Pre
globalThis.Progress = _styled.Progress
globalThis.Q = _styled.Q
globalThis.Rp = _styled.Rp
globalThis.Rt = _styled.Rt
globalThis.Ruby = _styled.Ruby
globalThis.S = _styled.S
globalThis.Samp = _styled.Samp
globalThis.Section = _styled.Section
// globalThis.Select = _styled.Select
globalThis.Small = _styled.Small
globalThis.Span = _styled.Span
globalThis.Strong = _styled.Strong
globalThis.Sub = _styled.Sub
globalThis.Summary = _styled.Summary
globalThis.Sup = _styled.Sup
globalThis.Svg = _styled.Svg
globalThis.Table = _styled.Table
globalThis.Tbody = _styled.Tbody
globalThis.Td = _styled.Td
// globalThis.Textarea = _styled.Textarea
globalThis.Tfoot = _styled.Tfoot
globalThis.Th = _styled.Th
globalThis.Thead = _styled.Thead
globalThis.Time = _styled.Time
globalThis.Tr = _styled.Tr
globalThis.U = _styled.U
globalThis.Ul = _styled.Ul
globalThis.Video = _styled.Video

globalThis.Flex = _styled.Flex
globalThis.FlexC = _styled.FlexC
