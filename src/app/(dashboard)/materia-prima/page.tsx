'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { EmptyState } from '@/components/feedback/EmptyState'
import { SkeletonTable } from '@/components/feedback/Skeleton'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Package, AlertCircle, CheckCircle2, X } from 'lucide-react'

type Lote = {
  id: string; nome: string; unidade: string; dataCompra: string
  qtdComprada: number; unidPorItem: number; valorTotal: number
  valorUnitario: number; estoqueLote: number; observacao?: string
}

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtData(d: string) { return new Date(d).toLocaleDateString('pt-BR') }

const EMPTY = { nome: '', unidade: '', dataCompra: '', qtdComprada: '', unidPorItem: '1', valorTotal: '', observacao: '' }

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border max-w-sm"
      style={{
        background: type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
        borderColor: type === 'success' ? 'var(--success-border)' : 'var(--danger-border)',
        color: type === 'success' ? 'var(--success)' : 'var(--danger)',
        animation: 'modal-in 0.2s ease-out',
      }}
    >
      {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      <span className="text-sm font-medium flex-1">{msg}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100"><X size={14} /></button>
    </div>
  )
}

export default function MateriaPrimaPage() {
  const [lotes, setLotes] = useState<Lote[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'novo' | 'editar' | null>(null)
  const [editando, setEditando] = useState<Lote | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [filtroMaterial, setFiltroMaterial] = useState('')
  const [filtroData, setFiltroData] = useState('')
  const POR_PAGINA = 15

  const carregar = useCallback(() => {
    setLoading(true)
    fetch('/api/materia-prima').then(r => r.json()).then(setLotes).finally(() => setLoading(false))
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const valorUnitarioCalc = () => {
    const qtd = parseFloat(form.qtdComprada) || 0
    const unid = parseFloat(form.unidPorItem) || 1
    const vt = parseFloat(form.valorTotal) || 0
    if (qtd > 0 && unid > 0 && vt > 0) return vt / (qtd * unid)
    return null
  }

  const abrirNovo = () => {
    setForm(EMPTY)
    setEditando(null)
    setErro('')
    setModal('novo')
  }

  const abrirEditar = (lote: Lote) => {
    setForm({
      nome: lote.nome, unidade: lote.unidade,
      dataCompra: lote.dataCompra.split('T')[0],
      qtdComprada: String(lote.qtdComprada),
      unidPorItem: String(lote.unidPorItem),
      valorTotal: String(lote.valorTotal),
      observacao: lote.observacao || '',
    })
    setEditando(lote)
    setErro('')
    setModal('editar')
  }

  const salvar = async () => {
    setSalvando(true); setErro('')
    const body = {
      nome: form.nome,
      unidade: form.unidade,
      dataCompra: form.dataCompra,
      qtdComprada: parseFloat(form.qtdComprada),
      unidPorItem: parseFloat(form.unidPorItem),
      valorTotal: parseFloat(form.valorTotal),
      observacao: form.observacao || undefined,
    }
    try {
      const url = editando ? `/api/materia-prima/${editando.id}` : '/api/materia-prima'
      const method = editando ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { setErro(data.error || 'Erro ao salvar'); return }
      setModal(null)
      setToast({ msg: editando ? 'Lote atualizado com sucesso!' : 'Lote cadastrado com sucesso!', type: 'success' })
      carregar()
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (lote: Lote) => {
    if (!confirm(`Excluir lote "${lote.nome}" (${fmtData(lote.dataCompra)})?`)) return
    const res = await fetch(`/api/materia-prima/${lote.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json()
      setToast({ msg: d.error || 'Erro ao excluir', type: 'error' })
      return
    }
    setToast({ msg: 'Lote excluído.', type: 'success' })
    carregar()
  }

  // Nomes de materiais únicos, em ordem alfabética (para dropdown e filtro)
  const nomesUnicos = Array.from(new Set(lotes.map(l => l.nome))).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  // Mapa nome → unidade (para auto-preencher a unidade ao escolher material existente)
  const unidadePorNome = lotes.reduce((acc: Record<string, string>, l) => {
    if (!acc[l.nome]) acc[l.nome] = l.unidade
    return acc
  }, {})

  // Aplica filtros (material e data da compra) — client-side
  const lotesFiltrados = lotes.filter(l => {
    if (filtroMaterial && l.nome !== filtroMaterial) return false
    if (filtroData && l.dataCompra.split('T')[0] !== filtroData) return false
    return true
  })

  const inicio = (pagina - 1) * POR_PAGINA
  const paginas = Math.ceil(lotesFiltrados.length / POR_PAGINA)
  const lotesVisiveis = lotesFiltrados.slice(inicio, inicio + POR_PAGINA)

  const totalPorNome = lotes.reduce((acc: Record<string, number>, l) => {
    acc[l.nome] = (acc[l.nome] || 0) + l.estoqueLote
    return acc
  }, {})

  const vu = valorUnitarioCalc()

  return (
    <div>
      <Header
        title="Matéria-Prima"
        subtitle={loading ? 'Carregando...' : `${lotes.length} lote(s) cadastrado(s)`}
        action={
          <button onClick={abrirNovo} className="btn-primary">
            <Plus size={16} /> Novo Lote
          </button>
        }
      />

      {loading ? (
        <SkeletonTable rows={8} cols={9} />
      ) : lotes.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Package}
            title="Nenhum lote cadastrado"
            description='Cadastre seu primeiro lote de matéria-prima clicando em "Novo Lote".'
            action={
              <button onClick={abrirNovo} className="btn-primary">
                <Plus size={16} /> Novo Lote
              </button>
            }
          />
        </div>
      ) : (
        <>
        {/* Filtros: material e data da compra */}
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Material</label>
            <select
              className="input-field"
              style={{ minWidth: '200px' }}
              value={filtroMaterial}
              onChange={e => { setFiltroMaterial(e.target.value); setPagina(1) }}
            >
              <option value="">Todos os materiais</option>
              {nomesUnicos.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Data da compra</label>
            <input
              type="date"
              className="input-field"
              value={filtroData}
              onChange={e => { setFiltroData(e.target.value); setPagina(1) }}
            />
          </div>
          {(filtroMaterial || filtroData) && (
            <button
              onClick={() => { setFiltroMaterial(''); setFiltroData(''); setPagina(1) }}
              className="btn-secondary"
            >
              Limpar filtros
            </button>
          )}
          <span className="text-sm ml-auto" style={{ color: 'var(--text-muted)' }}>
            {lotesFiltrados.length} resultado(s)
          </span>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Unidade</th>
                  <th>Data Compra</th>
                  <th>Qtd Comprada</th>
                  <th>Unid/Item</th>
                  <th>Valor Total</th>
                  <th>Val. Unit.</th>
                  <th>Estoque Lote</th>
                  <th>Estoque Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lotesVisiveis.map(lote => (
                  <tr key={lote.id}>
                    <td className="font-medium">{lote.nome}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{lote.unidade}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{fmtData(lote.dataCompra)}</td>
                    <td>{lote.qtdComprada}</td>
                    <td>{lote.unidPorItem}</td>
                    <td className="font-medium">{fmt(lote.valorTotal)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{fmt(lote.valorUnitario)}</td>
                    <td>
                      <span
                        className="font-semibold text-sm"
                        style={{ color: lote.estoqueLote <= 0 ? 'var(--danger)' : 'var(--success)' }}
                      >
                        {lote.estoqueLote.toFixed(3)} {lote.unidade}
                      </span>
                    </td>
                    <td className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {(totalPorNome[lote.nome] || 0).toFixed(3)} {lote.unidade}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          onClick={() => abrirEditar(lote)}
                          title="Editar"
                          className="p-1.5 rounded hover:bg-blue-50 transition-colors"
                          style={{ color: 'var(--text-subtle)' }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => excluir(lote)}
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

          {lotesFiltrados.length === 0 && (
            <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
              Nenhum lote encontrado para o filtro selecionado.
            </p>
          )}

          {paginas > 1 && (
            <div
              className="flex items-center justify-between mt-4 pt-4 border-t px-1"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {inicio + 1}–{Math.min(inicio + POR_PAGINA, lotesFiltrados.length)} de {lotesFiltrados.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className="btn-secondary py-1.5 px-2.5 disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setPagina(p => Math.min(paginas, p + 1))}
                  disabled={pagina === paginas}
                  className="btn-secondary py-1.5 px-2.5 disabled:opacity-40"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
        </>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => !salvando && setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg" style={{ color: 'var(--vinho)' }}>
                {modal === 'novo' ? 'Novo Lote de Matéria-Prima' : `Editar — ${editando?.nome}`}
              </h2>
              <button
                onClick={() => setModal(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Material *</label>
                <input type="text" className="input-field" value={form.nome} list="materiais-existentes"
                  onChange={e => {
                    const nome = e.target.value
                    // Ao escolher um material já cadastrado, preenche a unidade automaticamente.
                    const unidade = unidadePorNome[nome]
                    setForm(f => ({ ...f, nome, ...(unidade ? { unidade } : {}) }))
                  }}
                  placeholder="Selecione um existente ou digite um novo..." autoFocus />
                <datalist id="materiais-existentes">
                  {nomesUnicos.map(n => <option key={n} value={n} />)}
                </datalist>
                <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>
                  Escolha um material já cadastrado para lançar um novo lote (datas/preços diferentes), ou digite um novo.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Unidade *</label>
                <input type="text" className="input-field" value={form.unidade}
                  onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))}
                  placeholder="kg, m, un, L..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Data da Compra *</label>
                <input type="date" className="input-field" value={form.dataCompra}
                  onChange={e => setForm(f => ({ ...f, dataCompra: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Qtd Comprada *</label>
                <input type="number" className="input-field" value={form.qtdComprada} step="0.001"
                  onChange={e => setForm(f => ({ ...f, qtdComprada: e.target.value }))}
                  placeholder="Ex: 10" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Unid. por Item *</label>
                <input type="number" className="input-field" value={form.unidPorItem} step="0.001"
                  onChange={e => setForm(f => ({ ...f, unidPorItem: e.target.value }))}
                  placeholder="Ex: 0.5" />
                <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>Qtd real = Qtd × Unid/Item</p>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Valor Total (R$) *</label>
                <input type="number" className="input-field" value={form.valorTotal} step="0.01"
                  onChange={e => setForm(f => ({ ...f, valorTotal: e.target.value }))}
                  placeholder="Valor total pago" />
              </div>

              {vu !== null && (
                <div
                  className="sm:col-span-2 p-3 rounded-lg border text-sm"
                  style={{
                    background: 'var(--success-bg)',
                    borderColor: 'var(--success-border)',
                    color: 'var(--success)',
                  }}
                >
                  <strong>Valor Unitário: {fmt(vu)}</strong>
                  {' '}por {form.unidade} ·
                  Estoque: {((parseFloat(form.qtdComprada) || 0) * (parseFloat(form.unidPorItem) || 1)).toFixed(3)} {form.unidade}
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Observação</label>
                <input type="text" className="input-field" value={form.observacao}
                  onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
                  placeholder="Opcional" />
              </div>
            </div>

            {erro && (
              <div className="alert alert-danger mt-4">
                <AlertCircle size={15} />
                <span>{erro}</span>
              </div>
            )}

            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setModal(null)} disabled={salvando} className="btn-secondary">
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando} className="btn-primary">
                {salvando ? 'Salvando...' : 'Salvar Lote'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}
