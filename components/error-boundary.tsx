"use client"

// App-wide error boundary: catches render/runtime errors in the route tree and
// shows a recoverable fallback instead of an unstyled white screen.
import { Component, type ErrorInfo, type ReactNode } from "react"

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log the message and component stack for debugging — no user/session data.
    console.error("Unhandled UI error:", error.message, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-neutral-950 to-black text-neutral-100 px-6">
        <div className="max-w-md w-full text-center backdrop-blur-md bg-neutral-800/50 border border-neutral-700 rounded-2xl p-8 shadow-xl">
          <h1 className="text-2xl font-bold text-violet-400 mb-3">Something went wrong</h1>
          <p className="text-neutral-300 mb-6">
            An unexpected error occurred while rendering this page. You can try again, and if it
            keeps happening, reload the page.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="bg-violet-600 hover:bg-violet-700 px-5 py-2 rounded-lg transition-colors"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="border border-neutral-600 hover:border-violet-400 px-5 py-2 rounded-lg transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    )
  }
}
