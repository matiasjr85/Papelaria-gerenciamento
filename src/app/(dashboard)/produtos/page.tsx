'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { EmptyState } from '@/components/feedback/EmptyState'
import { SkeletonTable } from '@/components/feedback/Skeleton'
import { useToast, useConfirm } from '@/components/ui/UiProvider'
import {
  Pencil, Trash2, ToggleLeft, ToggleRight,
  ChevronLeft, ChevronRight, BookOpen, Plus, Package,
  PackagePlus, AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'

type Produto = {
  id: string; nome: string; custoUnitario: number; precoSugerido: number
  precoVenda: number; estoque: number; status: 'ATIVO' | 'INATIVO'
}

type BOMComp = {
  id: string
  tipoComponente: 'MATERIA_PRIMA' | 'PRODUTO'
  quantidade: number
  materiaPrima?: { id: string; nome: string; unidade: string }
  componenteProduto?: { id: string; nome: string }
}

type MP = { id: string; nome: string; unidade: string; estoqueLote: number }

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }

export default function ProdutosPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [mps, setMps] = useState<MP[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState<'ATIVO' | 'INATIVO' | ''>('')
  const [pagina, setPagina] = useState(1)
  const POR_PAGINA = 15

  // Modals
  const [modalPreco, setModalPreco] = useState<Produto | null>(null)
  const [modalBOM, setModalBOM] = useState<{ produto: Produto; componentes: BOMComp[] } | null>(null)
  const [formPreco, setFormPreco] = useState({ precoVenda: '', precoSugerido: '' })
  const [erroModal, setErroModal] = useState('')
  const [salvando, setSalvando] = useState(false)

  // BOM edit state
  const [bomComponentes, setBomComponentes] = useState<Array<{
    tipoComponente: 'MATERIA_PRIMA' | 'PRODUTO'; id: string; quantidade: string; nomeDisplay: string
  }>>([])
  const [novoBomComp, setNovoBomComp] = useState({ tipo: 'MATERIA_PRIMA' as 'MATERIA_PRIMA' | 'PRODUTO', id: '', qtd: '' })

  // Produzir mais (a partir do produto já cadastrado, usando o BOM salvo)
  const [modalProduzir, setModalProduzir] = useState<Produto | null>(null)
  const [qtdProduzir, setQtdProduzir] = useState('1')
  const [previewProd, setPreviewProd] = useState<{ sucesso?: boolean; custoTotal?: number; custoUnitario?: number; faltaMP?: { nome: string; falta: number; disponivel: number }[]; faltaProdutos?: { nome: string; falta: number; disponivel: number }[]; maximoPossivel?: number; error?: string } | null>(null)
  const [produzindo, setProduzindo] = useState(false)

  // Preview ao vivo da produção (reusa o motor FIFO da montagem)
  useEffect(() => {
    if (!modalProduzir) { setPreviewProd(null); return }
    const q = parseFloat(qtdProduzir)
    if (!q || q <= 0) { setPreviewProd(null); return }
    const ctrl = new AbortController()
    const timer = setTimeout(() => {
      fetch(`/api/montagem?produtoId=${modalProduzir.id}&quantidade=${q}`, { signal: ctrl.signal })
        .then(r => r.json())
        .then(setPreviewProd)
        .catch(() => {})
    }, 300)
    return () => { clearTimeout(timer); ctrl.abort() }
  }, [modalProduzir, qtdProduzir])

  const abrirProduzir = (p: Produto) => {
    setModalProduzir(p)
    setQtdProduzir('1')
    setPreviewProd(null)
  }

  const produzir = async () => {
    if (!modalProduzir) return
    const q = parseFloat(qtdProduzir)
    if (!q || q <= 0) { toast.error('Informe uma quantidade válida'); return }
    setProduzindo(true)
    try {
      const res = await fetch(`/api/produtos/${modalProduzir.id}/produzir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantidade: q }),
      })
      const d = await res.json()
      if (!res.ok) {
        if (d.detalhes) {
          const det = d.detalhes.map((x: { nome?: string; falta?: number }) => `${x.nome || 'item'}: falta ${(x.falta || 0).toFixed(3)}`).join(', ')
          toast.error(`${d.error}: ${det}`)
        } else {
          toast.error(d.error || 'Erro ao produzir')
        }
        return
      }
      toast.success(`+${q} un. de "${modalProduzir.nome}" produzidas! Custo unit.: ${fmt(d.custoUnitario)}`)
      setModalProduzir(null)
      carregar()
    } finally { setProduzindo(false) }
  }

  const carregar = useCallback(() => {
    setLoading(true)
    const params = filtroStatus ? `?status=${filtroStatus}` : ''
    Promise.all([
      fetch(`/api/produtos${params}`).then(r => r.json()),
      fetch('/api/materia-prima').then(r => r.json()),
    ]).then(([p, m]) => { setProdutos(p); setMps(m) }).finally(() => setLoading(false))
  }, [filtroStatus])

  useEffect(() => { carregar(); setPagina(1) }, [carregar])

  const toggleStatus = async (produto: Produto) => {
    const novoStatus = produto.status === 'ATIVO' ? 'INATIVO' : 'ATIVO'
    await fetch(`/api/produtos/${produto.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus }),
    })
    carregar()
  }

  const excluir = async (produto: Produto) => {
    if (produto.estoque > 0) {
      toast.error('Produto com estoque. Faça descarte antes de excluir.')
      return
    }
    if (!(await confirm({
      title: 'Excluir produto?',
      message: 'Esta ação não pode ser desfeita.',
      danger: true,
      confirmLabel: 'Excluir',
    }))) return
    const res = await fetch(`/api/produtos/${produto.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json()
      toast.error(d.error || 'Erro ao excluir produto')
      return
    }
    toast.success('Produto excluído.')
    carregar()
  }

  const abrirEditarPreco = (p: Produto) => {
    setModalPreco(p)
    setFormPreco({ precoVenda: String(p.precoVenda), precoSugerido: String(p.precoSugerido) })
    setErroModal('')
  }

  const salvarPreco = async () => {
    if (!modalPreco) return
    setSalvando(true); setErroModal('')
    try {
      const res = await fetch(`/api/produtos/${modalPreco.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          precoVenda: parseFloat(formPreco.precoVenda),
          precoSugerido: parseFloat(formPreco.precoSugerido),
        }),
      })
      const d = await res.json()
      if (!res.ok) { setErroModal(d.error || 'Erro ao salvar'); return }
      setModalPreco(null)
      toast.success('Preço atualizado com sucesso!')
      carregar()
    } finally { setSalvando(false) }
  }

  const abrirEditarBOM = async (p: Produto) => {
    const res = await fetch(`/api/produtos/${p.id}`)
    const data = await res.json()
    const comps: BOMComp[] = data.especificacoes || []
    setModalBOM({ produto: p, componentes: comps })
    setBomComponentes(comps.map((c: BOMComp) => ({
      tipoComponente: c.tipoComponente,
      id: c.tipoComponente === 'MATERIA_PRIMA' ? (c.materiaPrima?.id || '') : (c.componenteProduto?.id || ''),
      quantidade: String(c.quantidade),
      nomeDisplay: c.tipoComponente === 'MATERIA_PRIMA' ? (c.materiaPrima?.nome || '') : (c.componenteProduto?.nome || ''),
    })))
    setNovoBomComp({ tipo: 'MATERIA_PRIMA', id: '', qtd: '' })
    setErroModal('')
  }

  const adicionarBomComp = () => {
    if (!novoBomComp.id || !novoBomComp.qtd) return
    const qtd = parseFloat(novoBomComp.qtd)
    if (!qtd || qtd <= 0) return
    let nomeDisplay = ''
    if (novoBomComp.tipo === 'MATERIA_PRIMA') {
      const mp = mps.find(m => m.id === novoBomComp.id)
      nomeDisplay = mp ? `${mp.nome} (${mp.unidade})` : novoBomComp.id
    } else {
      const p = produtos.find(p => p.id === novoBomComp.id)
      nomeDisplay = p?.nome || novoBomComp.id
    }
    setBomComponentes(prev => [...prev, { tipoComponente: novoBomComp.tipo, id: novoBomComp.id, quantidade: String(qtd), nomeDisplay }])
    setNovoBomComp({ tipo: 'MATERIA_PRIMA', id: '', qtd: '' })
  }

  const removerBomComp = (idx: number) => {
    setBomComponentes(prev => prev.filter((_, i) => i !== idx))
  }

  const salvarBOM = async () => {
    if (!modalBOM) return
    if (bomComponentes.length === 0) { setErroModal('Adicione pelo menos um componente'); return }
    setSalvando(true); setErroModal('')
    try {
      const res = await fetch(`/api/produtos/${modalBOM.produto.id}/bom`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          componentes: bomComponentes.map(c => ({
            tipoComponente: c.tipoComponente,
            materiaPrimaId: c.tipoComponente === 'MATERIA_PRIMA' ? c.id : null,
            componenteProdutoId: c.tipoComponente === 'PRODUTO' ? c.id : null,
            quantidade: parseFloat(c.quantidade),
          })),
        }),
      })
      const d = await res.json()
      if (!res.ok) { setErroModal(d.error || 'Erro ao salvar BOM'); return }
      setModalBOM(null)
      toast.success('Receita (BOM) atualizada com sucesso!')
      carregar()
    } finally { setSalvando(false) }
  }

  // Deduplicar MPs por nome para o select
  const mpsPorNome = mps.reduce((acc: Record<string, MP>, m) => {
    if (!acc[m.nome]) acc[m.nome] = m
    return acc
  }, {})
  const mpsUnicas = Object.values(mpsPorNome)

  const inicio = (pagina - 1) * POR_PAGINA
  const paginas = Math.ceil(produtos.length / POR_PAGINA)
  const visiveis = produtos.slice(inicio, inicio + POR_PAGINA)

  return (
    <div>
      <Header
        title="Produtos"
        subtitle={`${produtos.length} produto(s) · Use a Montagem para criar novos`}
        action={
          <Link href="/montagem" className="btn-primary">
            <Plus size={16} /> Montar Produto
          </Link>
        }
      />

      <div className="flex gap-3 mb-4">
        <select className="input-field w-40" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as any)}>
          <option value="">Todos</option>
          <option value="ATIVO">Ativos</option>
          <option value="INATIVO">Inativos</option>
        </select>
      </div>

      {loading ? (
        <SkeletonTable rows={6} cols={8} />
      ) : produtos.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Package}
            title="Nenhum produto cadastrado"
            description="Use a Montagem para criar seu primeiro produto a partir das matérias-primas."
            action={
              <Link href="/montagem" className="btn-primary">
                <Plus size={16} /> Montar Produto
              </Link>
            }
          />
        </div>
      ) : (
        <div className="card overflow-x-auto">
          {(
            <>
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Custo Unit.</th>
                    <th>Preço Sug.</th>
                    <th>Preço Venda</th>
                    <th>Estoque</th>
                    <th>Status</th>
                    <th>Margem</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map(p => {
                    const margem = p.precoVenda > 0 ? ((p.precoVenda - p.custoUnitario) / p.precoVenda) * 100 : 0
                    return (
                      <tr key={p.id}>
                        <td className="font-medium">{p.nome}</td>
                        <td>{fmt(p.custoUnitario)}</td>
                        <td className="text-gray-500">{fmt(p.precoSugerido)}</td>
                        <td className="font-semibold">{fmt(p.precoVenda)}</td>
                        <td>
                          <span className={p.estoque <= 0 ? 'text-red-500 font-medium' : p.estoque <= 5 ? 'text-amber-600 font-medium' : 'text-green-700 font-medium'}>
                            {p.estoque}
                          </span>
                        </td>
                        <td>
                          <span className={p.status === 'ATIVO' ? 'badge-ativo' : 'badge-inativo'}>
                            {p.status}
                          </span>
                        </td>
                        <td className={margem < 0 ? 'text-red-600' : 'text-green-700'}>
                          {margem.toFixed(1)}%
                        </td>
                        <td>
                          <div className="flex gap-2 items-center">
                            <button onClick={() => abrirProduzir(p)} title="Produzir mais (aumentar quantidade)"
                              className="p-1.5 rounded text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300">
                              <PackagePlus size={16} />
                            </button>
                            <button onClick={() => abrirEditarPreco(p)} title="Editar preço"
                              className="p-1.5 rounded text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
                              <Pencil size={15} />
                            </button>
                            <button onClick={() => abrirEditarBOM(p)} title="Editar receita (BOM)"
                              className="p-1.5 rounded text-gray-400 transition-colors hover:bg-purple-50 hover:text-purple-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300">
                              <BookOpen size={15} />
                            </button>
                            <button onClick={() => toggleStatus(p)}
                              title={p.status === 'ATIVO' ? 'Arquivar (desativar)' : 'Reativar'}
                              className="p-1.5 rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-vinho focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300">
                              {p.status === 'ATIVO'
                                ? <ToggleRight size={18} className="text-green-600" />
                                : <ToggleLeft size={18} />}
                            </button>
                            {p.estoque <= 0 && (
                              <button onClick={() => excluir(p)} title="Excluir permanentemente"
                                className="p-1.5 rounded text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {paginas > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <span className="text-sm text-gray-500">{inicio + 1}–{Math.min(inicio + POR_PAGINA, produtos.length)} de {produtos.length}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} className="btn-secondary py-1 px-2 disabled:opacity-40"><ChevronLeft size={14} /></button>
                    <button onClick={() => setPagina(p => Math.min(paginas, p + 1))} disabled={pagina === paginas} className="btn-secondary py-1 px-2 disabled:opacity-40"><ChevronRight size={14} /></button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Modal editar preço */}
      {modalPreco && (
        <div className="modal-overlay" onClick={() => setModalPreco(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-5" style={{ color: 'var(--vinho)' }}>
              Editar Preço — {modalPreco.nome}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preço de Venda (R$) *</label>
                <input type="number" className="input-field" step="0.01" min="0"
                  value={formPreco.precoVenda}
                  onChange={e => setFormPreco(f => ({ ...f, precoVenda: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preço Sugerido (R$)</label>
                <input type="number" className="input-field" step="0.01" min="0"
                  value={formPreco.precoSugerido}
                  onChange={e => setFormPreco(f => ({ ...f, precoSugerido: e.target.value }))} />
              </div>
            </div>
            <div className="mt-3 text-sm text-gray-500">
              Custo unitário atual: <strong>{fmt(modalPreco.custoUnitario)}</strong>
              {formPreco.precoVenda && parseFloat(formPreco.precoVenda) > 0 && (
                <span className="ml-2">
                  → Margem: <strong className={((parseFloat(formPreco.precoVenda) - modalPreco.custoUnitario) / parseFloat(formPreco.precoVenda) * 100) < 0 ? 'text-red-600' : 'text-green-700'}>
                    {((parseFloat(formPreco.precoVenda) - modalPreco.custoUnitario) / parseFloat(formPreco.precoVenda) * 100).toFixed(1)}%
                  </strong>
                </span>
              )}
            </div>
            {erroModal && <div className="alert-danger mt-4">{erroModal}</div>}
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setModalPreco(null)} className="btn-secondary">Cancelar</button>
              <button onClick={salvarPreco} disabled={salvando} className="btn-primary">
                {salvando ? 'Salvando...' : 'Salvar Preço'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar BOM */}
      {modalBOM && (
        <div className="modal-overlay" onClick={() => setModalBOM(null)}>
          <div className="modal-box" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-1" style={{ color: 'var(--vinho)' }}>
              Editar Receita (BOM) — {modalBOM.produto.nome}
            </h2>
            <p className="text-sm text-gray-500 mb-4">Defina os componentes usados por unidade do produto</p>

            {/* Lista de componentes */}
            <div className="space-y-2 mb-4">
              {bomComponentes.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-3">Nenhum componente</p>
              )}
              {bomComponentes.map((c, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 rounded px-3 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.tipoComponente === 'MATERIA_PRIMA' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {c.tipoComponente === 'MATERIA_PRIMA' ? 'MP' : 'Produto'}
                  </span>
                  <span className="flex-1 text-sm font-medium">{c.nomeDisplay}</span>
                  <span className="text-sm text-gray-600">{c.quantidade} por un.</span>
                  <button onClick={() => removerBomComp(i)} className="text-gray-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Adicionar componente */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Adicionar componente</p>
              <div className="flex gap-2">
                <select className="input-field w-36" value={novoBomComp.tipo}
                  onChange={e => setNovoBomComp(n => ({ ...n, tipo: e.target.value as any, id: '' }))}>
                  <option value="MATERIA_PRIMA">Matéria-Prima</option>
                  <option value="PRODUTO">Produto</option>
                </select>
                <select className="input-field flex-1" value={novoBomComp.id}
                  onChange={e => setNovoBomComp(n => ({ ...n, id: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {novoBomComp.tipo === 'MATERIA_PRIMA'
                    ? mpsUnicas.map(m => <option key={m.id} value={m.id}>{m.nome} ({m.unidade})</option>)
                    : produtos.filter(p => p.id !== modalBOM.produto.id).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)
                  }
                </select>
                <input type="number" className="input-field w-24" placeholder="Qtd" step="0.001" min="0.001"
                  value={novoBomComp.qtd}
                  onChange={e => setNovoBomComp(n => ({ ...n, qtd: e.target.value }))} />
                <button onClick={adicionarBomComp} className="btn-primary px-3">
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {erroModal && <div className="alert-danger mt-4">{erroModal}</div>}

            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setModalBOM(null)} className="btn-secondary">Cancelar</button>
              <button onClick={salvarBOM} disabled={salvando} className="btn-primary">
                {salvando ? 'Salvando...' : 'Salvar Receita'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal produzir mais */}
      {modalProduzir && (
        <div className="modal-overlay" onClick={() => !produzindo && setModalProduzir(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-1 flex items-center gap-2" style={{ color: 'var(--magenta)' }}>
              <PackagePlus size={20} /> Produzir mais — {modalProduzir.nome}
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Estoque atual: <strong>{modalProduzir.estoque}</strong> · usa a receita (BOM) salva e consome matéria-prima por FIFO.
            </p>

            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Quantidade a produzir *</label>
            <input
              type="number" className="input-field" min="0.001" step="0.001" autoFocus
              value={qtdProduzir}
              onChange={e => setQtdProduzir(e.target.value)}
            />

            {/* Preview FIFO ao vivo */}
            {previewProd && (
              previewProd.sucesso ? (
                <div className="alert alert-success mt-4">
                  <span>
                    ✓ Estoque suficiente · Custo: <strong>{fmt(previewProd.custoTotal || 0)}</strong> total ·{' '}
                    <strong>{fmt(previewProd.custoUnitario || 0)}</strong> por unidade
                  </span>
                </div>
              ) : (
                <div className="alert alert-danger mt-4">
                  <AlertTriangle size={15} />
                  <div>
                    <div className="font-semibold">Estoque insuficiente</div>
                    {previewProd.faltaMP?.map((f, i) => (
                      <div key={i} className="text-sm">• {f.nome}: falta {f.falta.toFixed(3)} (tem {f.disponivel.toFixed(3)})</div>
                    ))}
                    {previewProd.faltaProdutos?.map((f, i) => (
                      <div key={i} className="text-sm">• {f.nome}: falta {f.falta} (tem {f.disponivel})</div>
                    ))}
                  </div>
                </div>
              )
            )}

            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setModalProduzir(null)} disabled={produzindo} className="btn-secondary">Cancelar</button>
              <button
                onClick={produzir}
                disabled={produzindo || (previewProd ? previewProd.sucesso === false : false)}
                className="btn-primary"
              >
                {produzindo ? 'Produzindo...' : 'Confirmar Produção'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
