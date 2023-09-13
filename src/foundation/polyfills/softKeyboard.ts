/**
 * Add a class to the documentElement when the soft keyboard is open. Is
 * useful for hiding the footer when the keyboard is open.
 *
 * We detect this by comparing the window's outerHeight to its innerHeight.
 */
const softKeyboardListener = () => {
  setTimeout(() => {
    if (window.outerHeight - window.innerHeight > 300) {
      window.isSoftKeyboardOpen = true
      document.documentElement.classList.add('keyboard-open')
    } else {
      window.isSoftKeyboardOpen = false
      document.documentElement.classList.remove('keyboard-open')
    }
  }, 200) // 50 is the minimum delay that works on iOS
}
addEventListener('focusin', softKeyboardListener)
addEventListener('focusout', softKeyboardListener)

export {}
