import { useSyncExternalStore } from "react"

const query = "(max-width: 767px)"

function subscribe(onChange: () => void) {
  const media = window.matchMedia(query)
  media.addEventListener("change", onChange)
  return () => media.removeEventListener("change", onChange)
}

const readMobile = () => window.matchMedia(query).matches
const serverMobile = () => false

export function useIsMobile() {
  return useSyncExternalStore(subscribe, readMobile, serverMobile)
}
