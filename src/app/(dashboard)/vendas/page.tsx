'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Header } from '@/components/layout/Header'
import { EmptyState } from '@/components/feedback/EmptyState'
import { SkeletonTable } from '@/components/feedback/Skeleton'
import { useToast, useConfirm } from '@/components/ui/UiProvider'
import { Plus, Undo2, ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react'

type Produto = { id: string; nome: string; estoque: number; precoVenda: number; custoUnitario: number }
type Venda = {
  id: string; produtoNome: string; quantidade: number; precoVenda: number
  valorVenda: number; totalGastos: number; lucro: number; dataVenda: string; status: 'ATIVA' | 'DEVOLVIDA'
  taxaPct: number; servicoValor: number
}

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtData(d: string) { return new Date(d).toLocaleDateString('pt-BR') }

export default function VendasPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [vendas, setVendas] = useState<Venda[]>([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [paginas, setPaginas] = useState(1)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ produtoId: '', quantidade: '1', taxaPct: '0', servicoValor: '0', observacao: '' })
  const [preview, setPreview] = useState<any>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [filtroProduto, setFiltroProduto] = useState('')
  const [filtroData, setFiltroData] = useState('')
  const idempotencyKey = useRef('')

  const carregarVendas = useCallback((pg = 1) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(pg), limit: '20' })
    if (filtroProduto) params.set('produtoId', filtroProduto)
    if (filtroData) params.set('data', filtroData)
    fetch(`/api/vendas?${params.toString()}`)
      .then(r => r.json())
      .then(d => {
        setVendas(d.vendas || [])
        setTotal(d.total || 0)
        setPaginas(d.pages || 1)
      })
      .finally(() => setLoading(false))
  }, [filtroProduto, filtroData])

  // Carrega lista de produtos (todos) para o filtro e o modal
  useEffect(() => {
    fetch('/api/produtos').then(r => r.json()).then(setProdutos)
  }, [])

  // (Re)carrega vendas ao montar e sempre que os filtros mudam
  useEffect(() => {
    setPagina(1)
    carregarVendas(1)
  }, [carregarVendas])

  const filtrosAtivos = !!(filtroProduto || filtroData)

  // Preview ao vivo
  useEffect(() => {
    const p = form.produtoId
    const q = parseFloat(form.quantidade)
    const t = parseFloat(form.taxaPct) || 0
    const s = parseFloat(form.servicoValor) || 0
    if (!p || !q || q <= 0) { setPreview(null); return }

    const timer = setTimeout(() => {
      setLoadingPreview(true)
      fetch(`/api/vendas?produtoId=${p}&quantidade=${q}&taxaPct=${t}&servicoValor=${s}`)
        .then(r => r.json())
        .then(d => {
          if (d.error) setPreview({ erro: d.error, disponivel: d.disponivel })
          else setPreview(d)
        })
        .finally(() => setLoadingPreview(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [form.produtoId, form.quantidade, form.taxaPct, form.servicoValor])

  const abrirModal = () => {
    setForm({ produtoId: '', quantidade: '1', taxaPct: '0', servicoValor: '0', observacao: '' })
    setPreview(null)
    setErro('')
    // Gera novo idempotency key único para essa tentativa de venda
    idempotencyKey.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setModal(true)
  }

  const registrar = async () => {
    if (salvando) return // Trava duplo clique
    setSalvando(true); setErro('')

    try {
      const body = {
        produtoId: form.produtoId,
        quantidade: parseFloat(form.quantidade),
        taxaPct: parseFloat(form.taxaPct) || 0,
        servicoValor: parseFloat(form.servicoValor) || 0,
        observacao: form.observacao || undefined,
        idempotencyKey: idempotencyKey.current,
      }

      const res = await fetch('/api/vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        setErro(data.error || 'Erro ao registrar venda')
        return
      }

      setModal(false)
      toast.success('Venda registrada com sucesso!')
      carregarVendas()
    } finally {
      setSalvando(false)
    }
  }

  const devolver = async (venda: Venda) => {
    const ok = await confirm({
      title: 'Devolver venda?',
      message: `A venda de "${venda.produtoNome}" será marcada como devolvida e o estoque restaurado.`,
      danger: true,
      confirmLabel: 'Devolver',
    })
    if (!ok) return
    const res = await fetch(`/api/vendas/${venda.id}/devolucao`, { method: 'POST' })
    if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Erro ao devolver venda'); return }
    toast.success('Venda devolvida e estoque restaurado.')
    carregarVendas(pagina)
  }

  return (
    <div>
      <Header
        title="Vendas"
        subtitle={`${total} venda(s) registrada(s)`}
        action={<button onClick={abrirModal} className="btn-primary"><Plus size={16} /> Registrar Venda</button>}
      />

      {/* Filtros: produto e data da venda */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Produto</label>
          <select
            className="input-field"
            style={{ minWidth: '220px' }}
            value={filtroProduto}
            onChange={e => setFiltroProduto(e.target.value)}
          >
            <option value="">Todos os produtos</option>
            {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Data da venda</label>
          <input
            type="date"
            className="input-field"
            value={filtroData}
            onChange={e => setFiltroData(e.target.value)}
          />
        </div>
        {filtrosAtivos && (
          <button onClick={() => { setFiltroProduto(''); setFiltroData('') }} className="btn-secondary">
            Limpar filtros
          </button>
        )}
      </div>

      {loading ? (
        <SkeletonTable rows={8} cols={9} />
      ) : vendas.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ShoppingCart}
            title={filtrosAtivos ? 'Nenhuma venda para o filtro' : 'Nenhuma venda registrada'}
            description={filtrosAtivos
              ? 'Ajuste ou limpe os filtros para ver outras vendas.'
              : 'Registre sua primeira venda clicando em "Registrar Venda".'}
            action={
              filtrosAtivos ? (
                <button onClick={() => { setFiltroProduto(''); setFiltroData('') }} className="btn-secondary">
                  Limpar filtros
                </button>
              ) : (
                <button onClick={abrirModal} className="btn-primary">
                  <Plus size={16} /> Registrar Venda
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Produto</th>
                    <th>Qtd</th>
                    <th>Preço Unit.</th>
                    <th>Valor Venda</th>
                    <th>Taxa/Serv.</th>
                    <th>Lucro</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {vendas.map(v => (
                    <tr key={v.id} className={v.status === 'DEVOLVIDA' ? 'opacity-50' : ''}>
                      <td>{fmtData(v.dataVenda)}</td>
                      <td className="font-medium">{v.produtoNome}</td>
                      <td>{v.quantidade}</td>
                      <td>{fmt(v.precoVenda)}</td>
                      <td className="font-semibold">{fmt(v.valorVenda)}</td>
                      <td className="text-gray-500 text-sm">{fmt(v.totalGastos)}</td>
                      <td className={v.lucro >= 0 ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>{fmt(v.lucro)}</td>
                      <td>
                        <span className={v.status === 'ATIVA' ? 'badge-ativo' : 'badge-devolvida'}>{v.status}</span>
                      </td>
                      <td>
                        {v.status === 'ATIVA' && (
                          <button
                            onClick={() => devolver(v)}
                            title="Devolver venda"
                            className="p-1.5 rounded text-gray-400 hover:text-amber-600 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-300 transition-colors"
                          >
                            <Undo2 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {paginas > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <span className="text-sm text-gray-500">Página {pagina} de {paginas} · {total} vendas</span>
                  <div className="flex gap-2">
                    <button onClick={() => { setPagina(p => p - 1); carregarVendas(pagina - 1) }} disabled={pagina === 1} className="btn-secondary py-1 px-2 disabled:opacity-40"><ChevronLeft size={14} /></button>
                    <button onClick={() => { setPagina(p => p + 1); carregarVendas(pagina + 1) }} disabled={pagina === paginas} className="btn-secondary py-1 px-2 disabled:opacity-40"><ChevronRight size={14} /></button>
                  </div>
                </div>
              )}
        </div>
      )}

      {/* Modal de nova venda */}
      {modal && (
        <div className="modal-overlay" onClick={() => !salvando && setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-5 flex items-center gap-2" style={{ color: 'var(--vinho)' }}>
              <ShoppingCart size={20} /> Registrar Venda
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Produto *</label>
                <select className="input-field" value={form.produtoId} onChange={e => setForm(f => ({ ...f, produtoId: e.target.value }))}>
                  <option value="">Selecione o produto...</option>
                  {produtos.filter(p => p.estoque > 0).map(p => (
                    <option key={p.id} value={p.id}>{p.nome} — Estoque: {p.estoque} · R$ {p.precoVenda.toFixed(2)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade *</label>
                <input type="number" className="input-field" value={form.quantidade} min="1" step="1"
                  onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Taxa (%)</label>
                <input type="number" className="input-field" value={form.taxaPct} min="0" max="100" step="0.1"
                  onChange={e => setForm(f => ({ ...f, taxaPct: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Serviço (R$)</label>
                <input type="number" className="input-field" value={form.servicoValor} min="0" step="0.01"
                  onChange={e => setForm(f => ({ ...f, servicoValor: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
                <input type="text" className="input-field" value={form.observacao}
                  onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} placeholder="Opcional" />
              </div>
            </div>

            {/* Preview ao vivo */}
            {loadingPreview && <div className="mt-4 text-sm text-gray-400">Calculando...</div>}
            {preview && !loadingPreview && (
              preview.erro ? (
                <div className="alert-danger mt-4">
                  {preview.erro}
                  {preview.disponivel !== undefined && ` (disponível: ${preview.disponivel})`}
                </div>
              ) : (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-semibold text-gray-600 mb-3">Pré-visualização</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">Valor Venda:</span> <strong>{fmt(preview.valorVenda)}</strong></div>
                    <div><span className="text-gray-500">Total Gastos:</span> <strong>{fmt(preview.totalGastos)}</strong></div>
                    <div><span className="text-gray-500">Lucro:</span> <strong className={preview.lucro >= 0 ? 'text-green-700' : 'text-red-600'}>{fmt(preview.lucro)}</strong></div>
                    <div><span className="text-gray-500">Custo Unit.:</span> {fmt(preview.custoUnitario)}</div>
                  </div>
                </div>
              )
            )}

            {erro && <div className="alert-danger mt-4">{erro}</div>}

            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setModal(false)} disabled={salvando} className="btn-secondary">Cancelar</button>
              <button onClick={registrar} disabled={salvando || (preview?.erro !== undefined)} className="btn-primary">
                {salvando ? 'Registrando...' : 'Registrar Venda'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
