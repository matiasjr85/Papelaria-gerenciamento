import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-subtle)' }}
        >
          <Icon size={24} />
        </div>
      )}
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>
        {title}
      </h3>
      {description && (
        <p className="text-sm mb-4 max-w-xs" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
