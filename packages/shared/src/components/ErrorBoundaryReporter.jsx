import { Component } from 'react'

export function createErrorBoundaryReporter(reportFn) {
  return class ErrorBoundaryReporter extends Component {
    state = { hasError: false }

    static getDerivedStateFromError() {
      return { hasError: true }
    }

    componentDidCatch(error, info) {
      reportFn?.({
        error_type: 'render_error',
        error_message: error?.message,
        stack_trace: info?.componentStack,
        component_name: this.props.name,
      })
    }

    render() {
      if (this.state.hasError) {
        return (
          <div className="flex min-h-[200px] flex-col items-center justify-center p-8 text-center">
            <p className="text-gray-300">Something went wrong. Our team has been notified.</p>
            <button
              type="button"
              className="mt-4 text-sm text-blue-400 hover:underline"
              onClick={() => this.setState({ hasError: false })}
            >
              Try again
            </button>
          </div>
        )
      }
      return this.props.children
    }
  }
}
