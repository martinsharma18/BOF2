import { useEffect, useRef, useState } from 'react'

/** True while the returned ref's element is within (or near) the viewport. Used for infinite scroll. */
export function useInView<T extends Element>(rootMargin = '400px') {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry!.isIntersecting), { rootMargin })
    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin])

  return [ref, inView] as const
}
