import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Modal dialog behaviour: moves focus into the dialog, traps Tab, closes on Escape,
 * and restores focus to the previously focused element when closed.
 * Attach the returned ref to the dialog panel.
 */
export function useDialog(isOpen: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!isOpen) return
    const previous = document.activeElement as HTMLElement | null
    const panel = ref.current

    if (panel && !panel.contains(document.activeElement)) {
      const first =
        panel.querySelector<HTMLElement>('input:not([disabled]),select:not([disabled]),textarea:not([disabled])') ||
        panel.querySelector<HTMLElement>(FOCUSABLE)
      first?.focus()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !panel) return
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) return
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

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previous?.focus?.()
    }
  }, [isOpen])

  return ref
}
