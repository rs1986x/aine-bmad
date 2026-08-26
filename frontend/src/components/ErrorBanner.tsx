import { useEffect, useRef } from 'react'

interface ErrorBannerProps {
  message: string
  retrying: boolean
  onRetry: () => void
  focusRetry?: boolean
}

export function ErrorBanner({ message, retrying, onRetry, focusRetry = false }: ErrorBannerProps) {
  const retryRef = useRef<HTMLButtonElement>(null)
  const retryMatch = message.match(/^(.*)([Rr]etry)\.$/)
  const retryWord = retryMatch?.[2] ?? 'Retry'
  const messagePrefix = retryMatch?.[1] ?? `${message} `
  const punctuation = retryMatch?.[0].slice(-1) ?? message.match(/[.!?]$/)?.[0] ?? '.'

  useEffect(() => {
    if (focusRetry && !retrying) retryRef.current?.focus()
  }, [focusRetry, retrying])

  return (
    <div className="error-banner" role="alert" aria-busy={retrying}>
      <span>
        {messagePrefix}
        <button
          ref={retryRef}
          type="button"
          className="error-banner__retry"
          disabled={retrying}
          aria-busy={retrying}
          aria-label="Retry"
          onClick={onRetry}
        >
          {retryWord}
        </button>
        {punctuation}
      </span>
    </div>
  )
}
