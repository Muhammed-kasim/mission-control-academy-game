'use client'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'

export function MissionCanvasPerformance() {
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    let timer: number | undefined
    let stopped = false
    const requestFrame = () => {
      if (stopped || document.hidden) return
      invalidate()
      timer = window.setTimeout(requestFrame, 1000 / 30)
    }
    const updateVisibility = () => {
      if (document.hidden) {
        if (timer !== undefined) window.clearTimeout(timer)
      } else {
        requestFrame()
      }
    }

    document.addEventListener('visibilitychange', updateVisibility)
    requestFrame()
    return () => {
      stopped = true
      if (timer !== undefined) window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', updateVisibility)
    }
  }, [invalidate])

  return null
}
