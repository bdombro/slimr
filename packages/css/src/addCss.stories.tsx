import {addCss} from './index.js'

export default {
  title: '@slimr/css/addCss',
  component: addCss,
  tags: ['autodocs'],
}

/**
 * Add some css to the page and ensure it's only added once
 */
export function AddCss() {
  addCss(`
    .graytext {
      color: gray;
    }
  `)
  return <p className="graytext">This should be gray</p>
}
