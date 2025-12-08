import { toKebabCase } from "./string-to-kebab-case.js"

it("converts string to camel case", () => {
	expect(toKebabCase("")).toBe("")
	expect(toKebabCase("foo")).toBe("foo")
	expect(toKebabCase("foo-bar")).toBe("foo-bar")
	expect(toKebabCase("foo bar")).toBe("foo-bar")
	expect(toKebabCase("foo Bar")).toBe("foo-bar")
	expect(toKebabCase("foo-bar-baz")).toBe("foo-bar-baz")
	expect(toKebabCase("foo_bar_baz")).toBe("foo-bar-baz")
	expect(toKebabCase("foo bar baz")).toBe("foo-bar-baz")
	expect(toKebabCase("foo bar_baz")).toBe("foo-bar-baz")
	expect(toKebabCase("fooBarBaz")).toBe("foo-bar-baz")
})
