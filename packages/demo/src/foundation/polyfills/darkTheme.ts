/**
 * Add a class to the documentElement when the user has requested a dark theme
 * and update the meta theme-color tag
 */
const prefersDarkMatchMedia = matchMedia('(prefers-color-scheme: dark)')
const prefersDarkListener = (e: {matches: boolean}) => {
  if (e.matches) {
    window.prefersDark = true
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#333')
    document.documentElement.classList.add('prefers-dark')
  } else {
    window.prefersDark = false
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#fff')
    document.documentElement.classList.remove('prefers-dark')
  }
}
prefersDarkListener(prefersDarkMatchMedia)
prefersDarkMatchMedia.addEventListener('change', prefersDarkListener)

export {}
