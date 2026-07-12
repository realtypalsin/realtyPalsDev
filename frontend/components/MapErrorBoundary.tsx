'use client'

import { Component, type ReactNode } from 'react'
import { MapPin } from 'lucide-react'


interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('[MapErrorBoundary] Map failed to render:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[280px] rounded-2xl bg-gray-50 border border-gray-100 flex flex-col items-center justify-center gap-2 text-gray-400">
          <MapPin size={28} className="text-gray-300" />
          <p className="text-[12px] font-medium">Map currently unavailable</p>

          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-[11px] text-blue-500 hover:underline"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
