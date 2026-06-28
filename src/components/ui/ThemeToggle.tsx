'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) {
    return (
      <div
        className={compact ? 'w-7 h-7' : 'w-8 h-8'}
        style={{ background: 'var(--sidebar-hover)', borderRadius: 'var(--radius)' }}
      />
    )
  }

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="sidebar-link"
      title={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      style={{ width: 'calc(100% - 1rem)', padding: compact ? '0.5rem 0.875rem' : undefined }}
      aria-label="Alternar tema"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      {!compact && <span>{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>}
    </button>
  )
}
