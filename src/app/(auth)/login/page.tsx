'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { AlertCircle, LogIn } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao fazer login'); return }
      window.location.href = '/dashboard'
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex"
      style={{
        background: 'linear-gradient(135deg, #1a0a10 0%, #3d0f26 40%, #7B2D42 100%)',
      }}
    >
      {/* Decoração esquerda */}
      <div className="hidden lg:flex lg:flex-1 flex-col items-center justify-center p-12 relative">
        {/* Círculos decorativos com as cores do logo */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-10"
          style={{ background: '#E91E8C', filter: 'blur(80px)' }} />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full opacity-10"
          style={{ background: '#29ABE2', filter: 'blur(60px)' }} />
        <div className="absolute top-1/2 right-1/3 w-32 h-32 rounded-full opacity-10"
          style={{ background: '#FFD700', filter: 'blur(50px)' }} />

        <div className="relative z-10 text-center">
          <div className="mb-8" style={{ filter: 'drop-shadow(0 0 40px rgba(233,30,140,0.3))' }}>
            <Image src="/logo-3aj.png" alt="3AJ Papelaria" width={280} height={120} className="object-contain" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Sistema de Gestão</h2>
          <p className="text-white/60 text-base max-w-xs mx-auto leading-relaxed">
            Controle completo de estoque, produção, vendas e finanças da sua papelaria personalizada.
          </p>
          {/* Features */}
          <div className="mt-8 space-y-2 text-left">
            {[
              { cor: '#E91E8C', txt: 'Controle de matéria-prima com custo FIFO' },
              { cor: '#29ABE2', txt: 'Montagem de produtos e BOM detalhado' },
              { cor: '#FFD700', txt: 'Dashboard financeiro completo' },
            ].map(f => (
              <div key={f.txt} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: f.cor }} />
                <span className="text-white/70 text-sm">{f.txt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
        <div
          className="w-full rounded-2xl p-8 shadow-2xl"
          style={{
            background: 'var(--surface)',
            maxWidth: '420px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-8">
            <Image src="/logo-3aj.png" alt="3AJ Papelaria" width={180} height={76} className="object-contain mx-auto" />
          </div>

          <div className="mb-7">
            <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Bem-vinda de volta</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Entre na sua conta para acessar o sistema
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>
                E-mail
              </label>
              <input
                type="email"
                className="input-field"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="seu@email.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>
                Senha
              </label>
              <input
                type="password"
                className="input-field"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="alert alert-danger">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-sm mt-2"
            >
              <LogIn size={16} />
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div
            className="mt-6 pt-5 border-t text-center text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            Não tem conta?{' '}
            <Link
              href="/cadastro"
              className="font-semibold"
              style={{ color: '#E91E8C' }}
            >
              Criar conta gratuita
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
