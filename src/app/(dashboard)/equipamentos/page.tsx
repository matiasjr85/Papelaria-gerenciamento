'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { EmptyState } from '@/components/feedback/EmptyState'
import { SkeletonTable } from '@/components/feedback/Skeleton'
import { Plus, Pencil, Trash2, Wrench, AlertCircle, X } from 'lucide-react'

type Equipamento = {
  id: string; nome: string; valorTotal: number; dataCompra: string; descricao?: string
  pecasReposicao: { id: string; nome: string; valorTotal: number; dataCompra: string }[]
}

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtData(d: string) { return new Date(d).toLocaleDateString('pt-BR') }

const EMPTY = { nome: '', valorTotal: '', dataCompra: '', descricao: '' }

export default function EquipamentosPage() {
  const [equips, setEquips] = useState<Equipamento[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Equipamento | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(() => {
    setLoading(true)
    fetch('/api/equipamentos').then(r => r.json()).then(setEquips).finally(() => setLoading(false))
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const abrir = (equip?: Equipamento) => {
    setEditando(equip || null)
    setForm(equip ? {
      nome: equip.nome, valorTotal: String(equip.valorTotal),
      dataCompra: equip.dataCompra.split('T')[0], descricao: equip.descricao || ''
    } : EMPTY)
    setErro('')
    setModal(true)
  }

  const salvar = async () => {
    setSalvando(true); setErro('')
    const body = { nome: form.nome, valorTotal: parseFloat(form.valorTotal), dataCompra: form.dataCompra, descricao: form.descricao || undefined }
    try {
      const url = editando ? `/api/equipamentos/${editando.id}` : '/api/equipamentos'
      const res = await fetch(url, { method: editando ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { setErro(data.error || 'Erro ao salvar'); return }
      setModal(false); carregar()
    } finally { setSalvando(false) }
  }

  const excluir = async (equip: Equipamento) => {
    if (!confirm(`Excluir equipamento "${equip.nome}"?`)) return
    const res = await fetch(`/api/equipamentos/${equip.id}`, { method: 'DELETE' })
    if (!res.ok) { const d = await res.json(); setErro(d.error || 'Erro ao excluir') }
    else carregar()
  }

  const totalInvestido = equips.reduce((s, e) => s + e.valorTotal, 0)

  return (
    <div>
      <Header
        title="Equipamentos"
        subtitle={loading ? 'Carregando...' : `${equips.length} equipamento(s) · Total: ${fmt(totalInvestido)}`}
        action={
          <button onClick={() => abrir()} className="btn-primary">
            <Plus size={16} /> Novo Equipamento
          </button>
        }
      />

      {loading ? (
        <SkeletonTable rows={5} cols={5} />
      ) : equips.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Wrench}
            title="Nenhum equipamento cadastrado"
            description="Registre seus equipamentos para controlar o investimento no período."
            action={
              <button onClick={() => abrir()} className="btn-primary">
                <Plus size={16} /> Novo Equipamento
              </button>
            }
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Valor</th>
                  <th>Data Compra</th>
                  <th>Descrição</th>
                  <th>Peças</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {equips.map(e => (
                  <tr key={e.id}>
                    <td className="font-medium">{e.nome}</td>
                    <td className="font-semibold" style={{ color: 'var(--vinho)' }}>{fmt(e.valorTotal)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{fmtData(e.dataCompra)}</td>
                    <td className="text-sm" style={{ color: 'var(--text-muted)' }}>{e.descricao || '—'}</td>
                    <td>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: e.pecasReposicao.length > 0 ? 'var(--info-bg)' : 'var(--bg-subtle)',
                          color: e.pecasReposicao.length > 0 ? 'var(--info)' : 'var(--text-muted)',
                        }}
                      >
                        {e.pecasReposicao.length} peça(s)
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => abrir(e)} title="Editar"
                          className="p-1.5 rounded transition-colors"
                          style={{ color: 'var(--text-subtle)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--azul)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subtle)')}
                        >
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => excluir(e)} title="Excluir"
                          className="p-1.5 rounded transition-colors"
                          style={{ color: 'var(--text-subtle)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subtle)')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => !salvando && setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg" style={{ color: 'var(--vinho)' }}>
                {editando ? `Editar — ${editando.nome}` : 'Novo Equipamento'}
              </h2>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Nome *</label>
                <input type="text" className="input-field" value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: Plotter, Impressora..." autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Valor Total (R$) *</label>
                <input type="number" className="input-field" value={form.valorTotal} step="0.01"
                  onChange={e => setForm(f => ({ ...f, valorTotal: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Data da Compra *</label>
                <input type="date" className="input-field" value={form.dataCompra}
                  onChange={e => setForm(f => ({ ...f, dataCompra: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Descrição</label>
                <input type="text" className="input-field" value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  placeholder="Opcional" />
              </div>
            </div>
            {erro && (
              <div className="alert alert-danger mt-4">
                <AlertCircle size={15} /><span>{erro}</span>
              </div>
            )}
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setModal(false)} disabled={salvando} className="btn-secondary">Cancelar</button>
              <button onClick={salvar} disabled={salvando} className="btn-primary">
                {salvando ? 'Salvando...' : 'Salvar Equipamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
