import { useEffect, useState } from 'react'

/** Phones (either orientation) and small tablets in portrait get the mobile-first editor. */
export const MOBILE_QUERY = '(max-width: 820px), (max-height: 520px) and (pointer: coarse)'

export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches)
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const on = () => setMobile(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return mobile
}
