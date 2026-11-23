// Safety-net React ErrorBoundary so an unexpected render error never leaves the user stranded
// on a blank black screen — instead shows a clear recovery card with the error details & 1-tap reset.
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  label?: string
  resetKey?: string | number
  onReset?: () => void
}

interface State {
  error: Error | null
  where: string
  copied: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, where: '', copied: false }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error, copied: false }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const where = (info.componentStack ?? '')
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 4)
      .join(' → ')
    this.setState({ where })
    console.error(`[KGuitar ErrorBoundary${this.props.label ? `:${this.props.label}` : ''}]`, error, info.componentStack)
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null, where: '', copied: false })
    }
  }

  private handleReset = () => {
    this.setState({ error: null, where: '', copied: false })
    this.props.onReset?.()
  }

  private handleCopy = () => {
    const err = this.state.error
    const text = `[${this.props.label ?? 'app'}] ${err?.message || String(err)}\n${this.state.where}\n${(err?.stack ?? '').slice(0, 400)}`
    try {
      void navigator.clipboard?.writeText(text)
      this.setState({ copied: true })
    } catch {
      /* clipboard unavailable */
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    const msg = this.state.error.message || String(this.state.error)
    return (
      <div
        className="panel stack"
        role="alert"
        data-testid="error-boundary"
        style={{
          margin: '24px auto',
          maxWidth: 480,
          gap: 10,
          padding: 16,
          borderRadius: 12,
          background: '#141824',
          color: '#f1f5f9',
          border: '2px solid var(--coral, #ef4444)',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Something hiccuped{this.props.label ? ` in ${this.props.label}` : ''}</h2>
        <p className="small muted" style={{ margin: 0 }}>
          Instead of going black, KGuitar caught the glitch so you can jump right back in.
        </p>
        <code
          className="small"
          style={{
            display: 'block',
            padding: '8px 10px',
            borderRadius: 8,
            background: 'rgba(0,0,0,0.45)',
            color: '#fca5a5',
            overflowWrap: 'anywhere',
            whiteSpace: 'pre-wrap',
            fontSize: 12,
          }}
        >
          {msg}
          {this.state.where ? `\n${this.state.where}` : ''}
        </code>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn primary" onClick={this.handleReset}>
            Reload {this.props.label ?? 'screen'}
          </button>
          <button type="button" className="btn" onClick={this.handleCopy}>
            {this.state.copied ? '✓ Copied' : 'Copy error'}
          </button>
          <button type="button" className="btn" onClick={() => window.location.reload()}>
            Restart app
          </button>
        </div>
      </div>
    )
  }
}
