import { Component } from 'react'

/**
 * Per-module error boundary — a broken remote must not crash the entire shell.
 */
export class ModuleErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error(`[Module: ${this.props.moduleName}] failed to load:`, error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center min-h-64 p-8 rounded-lg border border-red-800 bg-gray-900 text-gray-100"
          role="alert"
        >
          <h2 className="text-lg font-semibold text-red-400 mb-2">
            {this.props.moduleName} module failed to load
          </h2>
          <p className="text-sm text-gray-400 mb-4 text-center max-w-md">
            This module is temporarily unavailable. Other parts of the application are unaffected.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ModuleErrorBoundary
