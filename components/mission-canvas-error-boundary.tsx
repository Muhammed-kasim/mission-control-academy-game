'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface MissionCanvasErrorBoundaryProps {
  children: ReactNode
  fallback: ReactNode
  resetKey?: string
}

interface MissionCanvasErrorBoundaryState {
  hasError: boolean
}

export class MissionCanvasErrorBoundary extends Component<
  MissionCanvasErrorBoundaryProps,
  MissionCanvasErrorBoundaryState
> {
  state: MissionCanvasErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): MissionCanvasErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('The 3D preview failed. Showing its 2D fallback instead.', error, info)
  }

  componentDidUpdate(previousProps: MissionCanvasErrorBoundaryProps) {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false })
    }
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}
