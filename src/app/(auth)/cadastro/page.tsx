'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CadastroPage() {
  const router = useRouter()
  const [form, setForm] = useState({ nome: '', email: '', password: '', papelaria: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao cadastrar')
        return
      }

      window.location.href = '/dashboard'
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--vinho) 0%, var(--vinho-dark) 100%)' }}>
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--vinho)' }}>
            <span className="text-white font-bold text-xl">3AJ</span>
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--vinho)' }}>Criar conta</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input type="text" className="input-field" value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required placeholder="Seu nome" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Papelaria</label>
            <input type="text" className="input-field" value={form.papelaria}
              onChange={e => setForm(f => ({ ...f, papelaria: e.target.value }))} required placeholder="3AJ Papelaria" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" className="input-field" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required placeholder="seu@email.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input type="password" className="input-field" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required placeholder="Mínimo 6 caracteres" />
          </div>

          {error && <div className="alert-danger">{error}</div>}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          Já tem conta?{' '}
          <Link href="/login" className="font-medium" style={{ color: 'var(--vinho)' }}>Entrar</Link>
        </p>
      </div>
    </div>
  )
}
