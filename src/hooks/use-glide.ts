"use client"

import * as React from "react"

const EVENTS = [
  "pointerover",
  "pointerout",
  "pointerdown",
  "pointerup",
  "pointercancel",
  "focusin",
  "focusout",
] as const

function useGlide(...lit: string[]) {
  const key = lit.join("\n")
  return React.useCallback(
    (el: HTMLElement | null) => {
      const list = el?.parentElement
      if (!el || !list) return
      const selectors = key.split("\n")
      let shown = false
      let frame = 0

      const find = () => {
        for (const selector of selectors)
          for (const item of list.querySelectorAll<HTMLElement>(selector))
            if (item.parentElement?.closest("[data-glide]") === list)
              return item
      }

      const place = (initial = false) => {
        frame = 0
        const item = find()
        if (!item) {
          if (shown) el.setAttribute("data-hidden", "")
          shown = false
          return
        }
        const l = list.getBoundingClientRect()
        const r = item.getBoundingClientRect()
        const k =
          Math.abs(l.width - list.offsetWidth) < 1
            ? 1
            : l.width / list.offsetWidth
        const x = (r.left - l.left) / k - list.clientLeft + list.scrollLeft
        const y = (r.top - l.top) / k - list.clientTop + list.scrollTop

        const snap = initial || (!shown && getComputedStyle(el).opacity === "0")
        if (snap) el.style.transition = "none"
        el.style.translate = `${x}px ${y}px`
        el.style.width = `${r.width / k}px`
        el.style.height = `${r.height / k}px`
        el.style.borderRadius = getComputedStyle(item).borderRadius
        el.toggleAttribute("data-pressed", item.matches(":active"))
        const variant = item.getAttribute("data-variant")
        if (variant) el.setAttribute("data-variant", variant)
        else el.removeAttribute("data-variant")
        if (initial) el.removeAttribute("data-hidden")
        if (snap) {
          void el.offsetWidth
          el.style.transition = ""
        }
        el.removeAttribute("data-hidden")
        shown = true
      }

      const queue = () => {
        frame ||= requestAnimationFrame(() => place())
      }

      list.setAttribute("data-glide", "")
      place(true)
      const mutations = new MutationObserver((records) => {
        const own = (m: MutationRecord) =>
          m.target === el || (m.target === list && m.type === "attributes")
        if (!records.every(own)) queue()
      })
      mutations.observe(list, {
        subtree: true,
        childList: true,
        attributes: true,
      })
      const resize = new ResizeObserver(queue)
      resize.observe(list)
      for (const type of EVENTS) list.addEventListener(type, queue)

      return () => {
        cancelAnimationFrame(frame)
        mutations.disconnect()
        resize.disconnect()
        for (const type of EVENTS) list.removeEventListener(type, queue)
      }
    },
    [key]
  )
}

export { useGlide }
