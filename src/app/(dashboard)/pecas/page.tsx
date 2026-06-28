'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { EmptyState } from '@/components/feedback/EmptyState'
import { SkeletonTable } from '@/components/feedback/Skeleton'
import { useToast, useConfirm } from '@/components/ui/UiProvider'
import { Plus, Pencil, Trash2, Wrench, AlertCircle } from 'lucide-react'

type Peca = {
  id: string; nome: string; valorTotal: number; dataCompra: string; descricao?: string
  equipamentoId?: string; equipamento?: { nome: string }
}
type Equipamento = { id: string; nome: string }

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtData(d: string) { return new Date(d).toLocaleDateString('pt-BR') }

const EMPTY = { nome: '', valorTotal: '', dataCompra: '', equipamentoId: '', descricao: '' }

export default function PecasPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const [pecas, setPecas] = useState<Peca[]>([])
  const [equips, setEquips] = useState<Equipamento[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Peca | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(() => {
    setLoading(true)
    Promise.all([fetch('/api/pecas').then(r => r.json()), fetch('/api/equipamentos').then(r => r.json())])
      .then(([p, e]) => { setPecas(p); setEquips(e) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const abrir = (peca?: Peca) => {
    setEditando(peca || null)
    setForm(peca ? {
      nome: peca.nome, valorTotal: String(peca.valorTotal),
      dataCompra: peca.dataCompra.split('T')[0],
      equipamentoId: peca.equipamentoId || '',
      descricao: peca.descricao || ''
    } : EMPTY)
    setErro(''); setModal(true)
  }

  const salvar = async () => {
    setSalvando(true); setErro('')
    const body = { nome: form.nome, valorTotal: parseFloat(form.valorTotal), dataCompra: form.dataCompra, equipamentoId: form.equipamentoId || undefined, descricao: form.descricao || undefined }
    try {
      const url = editando ? `/api/pecas/${editando.id}` : '/api/pecas'
      const res = await fetch(url, { method: editando ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { setErro(data.error || 'Erro ao salvar'); return }
      setModal(false)
      toast.success(editando ? 'Peça atualizada com sucesso!' : 'Peça cadastrada com sucesso!')
      carregar()
    } finally { setSalvando(false) }
  }

  const excluir = async (peca: Peca) => {
    if (!(await confirm({
      title: `Excluir peça "${peca.nome}"?`,
      message: 'Esta ação não pode ser desfeita.',
      danger: true,
      confirmLabel: 'Excluir',
    }))) return
    const res = await fetch(`/api/pecas/${peca.id}`, { method: 'DELETE' })
    if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Erro ao excluir'); return }
    toast.success('Peça excluída.')
    carregar()
  }

  return (
    <div>
      <Header
        title="Peças de Reposição"
        subtitle={loading ? 'Carregando...' : `${pecas.length} peça(s) cadastrada(s)`}
        action={<button onClick={() => abrir()} className="btn-primary"><Plus size={16} /> Nova Peça</button>}
      />

      {loading ? (
        <SkeletonTable rows={6} cols={6} />
      ) : pecas.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Wrench}
            title="Nenhuma peça cadastrada"
            description='Cadastre sua primeira peça de reposição clicando em "Nova Peça".'
            action={
              <button onClick={() => abrir()} className="btn-primary">
                <Plus size={16} /> Nova Peça
              </button>
            }
          />
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Nome</th><th>Valor</th><th>Data</th><th>Equipamento</th><th>Descrição</th><th></th></tr></thead>
            <tbody>
              {pecas.map(p => (
                <tr key={p.id}>
                  <td className="font-medium">{p.nome}</td>
                  <td>{fmt(p.valorTotal)}</td>
                  <td>{fmtData(p.dataCompra)}</td>
                  <td className="text-gray-500 text-sm">{p.equipamento?.nome || '—'}</td>
                  <td className="text-gray-500 text-sm">{p.descricao || '—'}</td>
                  <td>
                    <div className="flex gap-1">
                      <button
                        onClick={() => abrir(p)}
                        title="Editar"
                        className="p-1.5 rounded hover:bg-blue-50 transition-colors"
                        style={{ color: 'var(--text-subtle)' }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => excluir(p)}
                        title="Excluir"
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
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => !salvando && setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-5" style={{ color: 'var(--vinho)' }}>
              {editando ? 'Editar Peça' : 'Nova Peça de Reposição'}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input type="text" className="input-field" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor Total (R$) *</label>
                <input type="number" className="input-field" value={form.valorTotal} step="0.01" onChange={e => setForm(f => ({ ...f, valorTotal: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                <input type="date" className="input-field" value={form.dataCompra} onChange={e => setForm(f => ({ ...f, dataCompra: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Equipamento (opcional)</label>
                <select className="input-field" value={form.equipamentoId} onChange={e => setForm(f => ({ ...f, equipamentoId: e.target.value }))}>
                  <option value="">Sem equipamento</option>
                  {equips.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input type="text" className="input-field" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Opcional" />
              </div>
            </div>
            {erro && (
              <div className="alert alert-danger mt-4">
                <AlertCircle size={15} />
                <span>{erro}</span>
              </div>
            )}
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setModal(false)} disabled={salvando} className="btn-secondary">Cancelar</button>
              <button onClick={salvar} disabled={salvando} className="btn-primary">{salvando ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
