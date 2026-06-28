'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { EmptyState } from '@/components/feedback/EmptyState'
import { SkeletonTable } from '@/components/feedback/Skeleton'
import { useToast } from '@/components/ui/UiProvider'
import { Plus, Trash2, AlertCircle } from 'lucide-react'

type MP = { id: string; nome: string; unidade: string; estoqueLote: number }
type Produto = { id: string; nome: string; estoque: number }
type Descarte = {
  id: string; tipo: string; quantidade: number; dataDescarte: string; motivo?: string
  materiaPrima?: { nome: string; unidade: string }
  produto?: { nome: string }
}

function fmtData(d: string) { return new Date(d).toLocaleDateString('pt-BR') }

export default function DescartesPage() {
  const toast = useToast()
  const [descartes, setDescartes] = useState<Descarte[]>([])
  const [mps, setMps] = useState<MP[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ tipo: 'MATERIA_PRIMA', mpId: '', produtoId: '', quantidade: '', motivo: '' })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const abrirNovo = () => { setForm({ tipo: 'MATERIA_PRIMA', mpId: '', produtoId: '', quantidade: '', motivo: '' }); setErro(''); setModal(true) }

  const carregar = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/descartes').then(r => r.json()),
      fetch('/api/materia-prima').then(r => r.json()),
      fetch('/api/produtos').then(r => r.json()),
    ]).then(([d, m, p]) => {
      setDescartes(d); setMps(m); setProdutos(p)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const salvar = async () => {
    setSalvando(true); setErro('')
    const body: any = {
      tipo: form.tipo,
      quantidade: parseFloat(form.quantidade),
      motivo: form.motivo || undefined,
    }
    if (form.tipo === 'MATERIA_PRIMA') body.materiaPrimaId = form.mpId
    else body.produtoId = form.produtoId

    try {
      const res = await fetch('/api/descartes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error || 'Erro ao registrar descarte'); return }
      setModal(false)
      toast.success('Descarte registrado com sucesso!')
      carregar()
    } finally { setSalvando(false) }
  }

  return (
    <div>
      <Header
        title="Descartes"
        subtitle="Registro de descarte de MP ou produto — não afeta o dashboard financeiro"
        action={<button onClick={abrirNovo} className="btn-primary"><Plus size={16} /> Novo Descarte</button>}
      />

      <div className="alert-warning mb-4 text-sm">
        <strong>Atenção:</strong> O descarte remove do estoque mas <strong>NÃO</strong> aparece como gasto no Dashboard. O custo da matéria-prima é contabilizado no mês da compra.
      </div>

      {loading ? (
        <SkeletonTable rows={6} cols={5} />
      ) : descartes.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Trash2}
            title="Nenhum descarte registrado"
            description='Registre o descarte de uma matéria-prima ou produto clicando em "Novo Descarte".'
            action={
              <button onClick={abrirNovo} className="btn-primary">
                <Plus size={16} /> Novo Descarte
              </button>
            }
          />
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>Data</th><th>Tipo</th><th>Item</th><th>Quantidade</th><th>Motivo</th></tr>
            </thead>
            <tbody>
              {descartes.map(d => (
                <tr key={d.id}>
                  <td>{fmtData(d.dataDescarte)}</td>
                  <td><span className={`text-xs px-2 py-0.5 rounded-full ${d.tipo === 'MATERIA_PRIMA' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{d.tipo === 'MATERIA_PRIMA' ? 'MP' : 'Produto'}</span></td>
                  <td className="font-medium">{d.materiaPrima?.nome || d.produto?.nome || '—'}</td>
                  <td>{d.quantidade} {d.materiaPrima?.unidade || 'un'}</td>
                  <td className="text-gray-500 text-sm">{d.motivo || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => !salvando && setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-5 flex items-center gap-2" style={{ color: 'var(--vinho)' }}>
              <Trash2 size={18} /> Registrar Descarte
            </h2>
            <div className="alert-warning mb-4 text-xs">Descarte registra no histórico mas não afeta o Dashboard financeiro.</div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                <select className="input-field" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value, mpId: '', produtoId: '' }))}>
                  <option value="MATERIA_PRIMA">Matéria-Prima</option>
                  <option value="PRODUTO">Produto</option>
                </select>
              </div>

              {form.tipo === 'MATERIA_PRIMA' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lote de MP *</label>
                  <select className="input-field" value={form.mpId} onChange={e => setForm(f => ({ ...f, mpId: e.target.value }))}>
                    <option value="">Selecione...</option>
                    {mps.filter(m => m.estoqueLote > 0).map(m => (
                      <option key={m.id} value={m.id}>{m.nome} — {m.estoqueLote.toFixed(3)} {m.unidade} disp.</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Produto *</label>
                  <select className="input-field" value={form.produtoId} onChange={e => setForm(f => ({ ...f, produtoId: e.target.value }))}>
                    <option value="">Selecione...</option>
                    {produtos.filter(p => p.estoque > 0).map(p => (
                      <option key={p.id} value={p.id}>{p.nome} — {p.estoque} disp.</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade *</label>
                <input type="number" className="input-field" value={form.quantidade} min="0.001" step="0.001"
                  onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                <input type="text" className="input-field" value={form.motivo}
                  onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} placeholder="Vencido, avariado, etc." />
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
              <button onClick={salvar} disabled={salvando} className="btn-danger">
                {salvando ? 'Registrando...' : 'Confirmar Descarte'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
