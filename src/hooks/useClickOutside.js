import { useEffect } from 'react'

export default function useClickOutside(ref, handler, active = true) {
  useEffect(() => {
    if (!active) return undefined
    const onPointer = (e) => {
      if (ref.current && !ref.current.contains(e.target)) handler(e)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') handler(e)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer, { passive: true })
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [ref, handler, active])
}
