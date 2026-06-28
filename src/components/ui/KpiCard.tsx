import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  accentColor?: string
  icon?: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
}

export function KpiCard({
  label,
  value,
  sub,
  accentColor = 'var(--vinho)',
  icon: Icon,
  trend,
  trendLabel,
}: KpiCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor =
    trend === 'up' ? 'var(--success)' : trend === 'down' ? 'var(--danger)' : 'var(--text-muted)'

  return (
    <div className="kpi-card" style={{ borderLeft: `3px solid ${accentColor}` }}>
      <div className="flex items-start justify-between">
        <span className="kpi-label">{label}</span>
        {Icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${accentColor}18`, color: accentColor }}
          >
            <Icon size={16} />
          </div>
        )}
      </div>
      <span className="kpi-value" style={{ color: accentColor }}>
        {value}
      </span>
      <div className="flex items-center gap-2">
        {sub && <span className="kpi-sub">{sub}</span>}
        {trend && trendLabel && (
          <span
            className="text-xs flex items-center gap-1 font-medium"
            style={{ color: trendColor }}
          >
            <TrendIcon size={11} />
            {trendLabel}
          </span>
        )}
      </div>
    </div>
  )
}
