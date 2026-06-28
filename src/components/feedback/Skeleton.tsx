interface SkeletonProps {
  className?: string
  width?: string
  height?: string
}

export function Skeleton({ className = '', width, height }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height: height || '1rem' }}
      aria-hidden="true"
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="card space-y-3">
      <Skeleton width="40%" height="0.75rem" />
      <Skeleton width="60%" height="1.75rem" />
      <Skeleton width="30%" height="0.75rem" />
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="space-y-0">
        {/* Header */}
        <div
          className="flex gap-4 px-4 py-3 border-b"
          style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}
        >
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="flex-1">
              <Skeleton height="0.65rem" width={i === 0 ? '60%' : '40%'} />
            </div>
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="flex gap-4 px-4 py-3 border-b"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            {Array.from({ length: cols }).map((_, colIdx) => (
              <div key={colIdx} className="flex-1">
                <Skeleton
                  height="0.875rem"
                  width={colIdx === 0 ? '70%' : colIdx % 2 === 0 ? '50%' : '60%'}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonKpiGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
