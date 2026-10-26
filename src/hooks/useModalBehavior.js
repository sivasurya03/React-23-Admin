import { useEffect, useRef } from 'react'

const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input:not([disabled]),select,[tabindex]:not([tabindex="-1"])'

let lockCount = 0

/** Locks body scroll, traps Tab focus inside `ref`, closes on Escape, restores focus on unmount. */
export default function useModalBehavior(open, onClose) {
  const ref = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return undefined
    const previouslyFocused = document.activeElement
    lockCount += 1
    if (lockCount === 1) {
      document.body.dataset.prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }

    const node = ref.current
    const focusables = () => (node ? [...node.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement) : [])
    const first = node?.querySelector('[data-autofocus]') || focusables()[0]
    first?.focus({ preventScroll: true })

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeRef.current?.()
        return
      }
      if (e.key !== 'Tab' || !node) return
      const items = focusables()
      if (!items.length) return
      const firstEl = items[0]
      const lastEl = items[items.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('keydown', onKey)
      lockCount = Math.max(0, lockCount - 1)
      if (lockCount === 0) {
        document.body.style.overflow = document.body.dataset.prevOverflow || ''
        delete document.body.dataset.prevOverflow
      }
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus({ preventScroll: true })
    }
  }, [open])

  return ref
}
