import {useEffect, useState} from 'react'

const matchMediaPrefersDark = matchMedia?.('(prefers-color-scheme:dark)')

export function useColorScheme() {
  const [dark, setDark] = useState(!!matchMediaPrefersDark?.matches)

  useEffect(() => {
    const updateColorScheme = () => {
      setDark(!!matchMediaPrefersDark?.matches)
    }
    matchMediaPrefersDark.addEventListener('change', updateColorScheme)
    return () => {
      matchMediaPrefersDark.removeEventListener('change', updateColorScheme)
    }
  }, [])

  return {dark, light: !dark, scheme: dark ? 'dark' : 'light'}
}
