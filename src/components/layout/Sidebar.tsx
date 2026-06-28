'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Package, Wrench, Settings, ShoppingCart,
  Scissors, LogOut, Box, Trash2, Menu, X, ChevronRight,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

const links = [
  { href: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/materia-prima', icon: Package,          label: 'Matéria-Prima' },
  { href: '/equipamentos',  icon: Wrench,           label: 'Equipamentos' },
  { href: '/pecas',         icon: Settings,         label: 'Peças de Reposição' },
  { href: '/montagem',      icon: Scissors,         label: 'Montagem' },
  { href: '/produtos',      icon: Box,              label: 'Produtos' },
  { href: '/vendas',        icon: ShoppingCart,     label: 'Vendas' },
  { href: '/descartes',     icon: Trash2,           label: 'Descartes' },
]

function NavLinks({ pathname, onClick }: { pathname: string; onClick?: () => void }) {
  return (
    <nav className="flex-1 py-2 space-y-0.5 px-2 overflow-y-auto">
      {links.map(({ href, icon: Icon, label }) => {
        const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            onClick={onClick}
            className={`sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={17} strokeWidth={isActive ? 2.5 : 1.8} className="flex-shrink-0" />
            <span className="flex-1 truncate">{label}</span>
            {isActive && <ChevronRight size={13} className="flex-shrink-0" style={{ opacity: 0.7 }} />}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarLogo() {
  return (
    <div
      className="flex items-center justify-center py-4 px-5 border-b"
      style={{ borderColor: 'rgba(255,255,255,0.12)' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-3aj.png"
        alt="3AJ Papelaria"
        style={{ width: '200px', height: 'auto', display: 'block' }}
      />
    </div>
  )
}

function MobileLogoBar({ papelaria }: { papelaria: string }) {
  return (
    <div className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-3aj.png" alt="3AJ" style={{ height: '28px', width: 'auto', display: 'block' }} />
      <span className="text-white font-semibold text-sm truncate">{papelaria}</span>
    </div>
  )
}

function UserFooter({ user, onLogout }: { user: { nome: string }; onLogout: () => void }) {
  return (
    <div
      className="p-2 border-t space-y-1"
      style={{ borderColor: 'rgba(255,255,255,0.1)' }}
    >
      <ThemeToggle />
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg mx-1"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        {/* Avatar com inicial em magenta */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-sm"
          style={{ background: 'linear-gradient(135deg, #E91E8C, #C4157A)', color: 'white' }}
        >
          {user.nome.charAt(0).toUpperCase()}
        </div>
        <span
          className="text-sm truncate flex-1 font-medium"
          style={{ color: 'rgba(255,255,255,0.85)' }}
        >
          {user.nome}
        </span>
        <button
          onClick={onLogout}
          title="Sair"
          className="p-1 rounded hover:bg-white/10 transition-colors"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          <LogOut size={14} />
        </button>
      </div>
    </div>
  )
}

export function Sidebar({ user }: { user: { nome: string; papelaria: string } }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Mobile top bar */}
      <div
        className="flex md:hidden items-center justify-between px-4 py-2.5 border-b sticky top-0 z-50"
        style={{
          background: 'var(--sidebar-bg)',
          borderColor: 'rgba(255,255,255,0.1)',
        }}
      >
        <MobileLogoBar papelaria={user.papelaria} />
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg"
          style={{ color: 'white', background: 'rgba(255,255,255,0.1)' }}
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 flex md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <aside
            className="relative w-72 max-w-full h-full flex flex-col"
            style={{ background: 'var(--sidebar-bg)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pr-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <SidebarLogo />
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg ml-2"
                style={{ color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.08)' }}
              >
                <X size={18} />
              </button>
            </div>
            <NavLinks pathname={pathname} onClick={() => setMobileOpen(false)} />
            <UserFooter user={user} onLogout={handleLogout} />
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="sidebar hidden md:flex">
        <SidebarLogo />
        <NavLinks pathname={pathname} />
        <UserFooter user={user} onLogout={handleLogout} />
      </aside>
    </>
  )
}
