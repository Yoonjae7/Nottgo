"use client"

import { Component, type ReactNode } from "react"

type State = { hasError: boolean }

/** Keeps the rest of the homepage usable if live-bus code throws at runtime */
export default class LiveBusErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-muted-foreground">
          Live bus map couldn&apos;t load. Try refreshing the page, or run{" "}
          <code className="rounded bg-muted px-1 text-xs">pnpm dev:clean</code> if the dev server was acting up.
        </div>
      )
    }
    return this.props.children
  }
}
