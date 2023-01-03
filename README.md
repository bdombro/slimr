# ustyle

A monorepo of tiny (~1kb) alternatives to the popular style libraries for react AND preact

Packages:

- './libs/css' aka '@style/css' - alternative to Emotion CSS
- './libs/styled' aka '@style/styled' - alternative to styled-components
- './libs/props' aka '@style/props' - alternative to chakra-ui/system

Pros:

- Much less bundle size and runtime sluggishness
- Less is more: less bugs, no breaking changes
- Compatible with preact and react
- Supports declaring styled components inside of Components for better code colocating and NO MORE NEED TO PASS ARGS!

Cons:

- No SSR support
