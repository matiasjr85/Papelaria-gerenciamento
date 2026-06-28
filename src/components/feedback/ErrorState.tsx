import { AlertTriangle } from 'lucide-react'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Algo deu errado',
  message = 'Ocorreu um erro ao carregar os dados.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
        style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}
      >
        <AlertTriangle size={24} />
      </div>
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>
        {title}
      </h3>
      <p className="text-sm mb-4 max-w-xs" style={{ color: 'var(--text-muted)' }}>
        {message}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary text-sm">
          Tentar novamente
        </button>
      )}
    </div>
  )
}
