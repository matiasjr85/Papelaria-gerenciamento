'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { EmptyState } from '@/components/feedback/EmptyState'
import { SkeletonCard } from '@/components/feedback/Skeleton'
import { useToast } from '@/components/ui/UiProvider'
import { Plus, Trash2, AlertTriangle, Package } from 'lucide-react'

type MP = { id: string; nome: string; unidade: string; estoqueLote: number }
type Produto = { id: string; nome: string; estoque: number }
type Componente = {
  tipoComponente: 'MATERIA_PRIMA' | 'PRODUTO'
  materiaPrimaId?: string
  componenteProdutoId?: string
  quantidade: number
  _nomeDisplay?: string
}

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }

export default function MontagemPage() {
  const toast = useToast()
  const [mps, setMps] = useState<MP[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    nome: '', precoSugerido: '', precoVenda: '', qtdProduzir: '1', observacao: ''
  })
  const [componentes, setComponentes] = useState<Componente[]>([])
  const [novoComp, setNovoComp] = useState<{ tipo: 'MATERIA_PRIMA' | 'PRODUTO'; id: string; qtd: string }>({
    tipo: 'MATERIA_PRIMA', id: '', qtd: ''
  })
  const [preview, setPreview] = useState<any>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [produtoExistente, setProdutoExistente] = useState<Produto | null>(null)

  const carregarDados = useCallback(() => {
    return Promise.all([
      fetch('/api/materia-prima').then(r => r.json()),
      fetch('/api/produtos').then(r => r.json()),
    ]).then(([m, p]) => { setMps(m); setProdutos(p) })
  }, [])

  useEffect(() => { carregarDados().finally(() => setLoading(false)) }, [carregarDados])

  // Detecta produto existente pelo nome
  useEffect(() => {
    if (!form.nome) { setProdutoExistente(null); return }
    const found = produtos.find(p => p.nome.toLowerCase() === form.nome.toLowerCase())
    setProdutoExistente(found || null)
  }, [form.nome, produtos])

  // Preview do custo (calcular FIFO)
  useEffect(() => {
    if (!produtoExistente || !form.qtdProduzir || componentes.length === 0) {
      setPreview(null); return
    }
    const qtd = parseFloat(form.qtdProduzir)
    if (!qtd || qtd <= 0) { setPreview(null); return }

    setLoadingPreview(true)
    fetch(`/api/montagem?produtoId=${produtoExistente.id}&quantidade=${qtd}`)
      .then(r => r.json())
      .then(setPreview)
      .finally(() => setLoadingPreview(false))
  }, [produtoExistente, form.qtdProduzir, componentes])

  const adicionarComponente = () => {
    if (!novoComp.id || !novoComp.qtd || parseFloat(novoComp.qtd) <= 0) {
      toast.error('Selecione o componente e informe a quantidade'); return
    }

    let nomeDisplay = ''
    if (novoComp.tipo === 'MATERIA_PRIMA') {
      nomeDisplay = mps.find(m => m.id === novoComp.id)?.nome || novoComp.id
    } else {
      nomeDisplay = produtos.find(p => p.id === novoComp.id)?.nome || novoComp.id
    }

    // Deduplica: se já existe o mesmo componente, atualiza quantidade
    setComponentes(prev => {
      const existing = prev.findIndex(c =>
        c.tipoComponente === novoComp.tipo &&
        (novoComp.tipo === 'MATERIA_PRIMA' ? c.materiaPrimaId === novoComp.id : c.componenteProdutoId === novoComp.id)
      )
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = { ...updated[existing], quantidade: parseFloat(novoComp.qtd) }
        return updated
      }
      return [...prev, {
        tipoComponente: novoComp.tipo,
        materiaPrimaId: novoComp.tipo === 'MATERIA_PRIMA' ? novoComp.id : undefined,
        componenteProdutoId: novoComp.tipo === 'PRODUTO' ? novoComp.id : undefined,
        quantidade: parseFloat(novoComp.qtd),
        _nomeDisplay: nomeDisplay,
      }]
    })
    setNovoComp({ tipo: 'MATERIA_PRIMA', id: '', qtd: '' })
  }

  const removerComponente = (idx: number) => {
    setComponentes(prev => prev.filter((_, i) => i !== idx))
  }

  const salvar = async () => {
    if (!form.nome) { toast.error('Informe o nome do produto'); return }
    if (componentes.length === 0) { toast.error('Adicione pelo menos 1 componente'); return }
    if (!form.qtdProduzir || parseFloat(form.qtdProduzir) <= 0) { toast.error('Informe a quantidade a produzir'); return }

    setSalvando(true)
    try {
      const body = {
        nome: form.nome,
        precoSugerido: parseFloat(form.precoSugerido) || 0,
        precoVenda: parseFloat(form.precoVenda) || 0,
        qtdProduzir: parseFloat(form.qtdProduzir),
        componentes: componentes.map(c => ({
          tipoComponente: c.tipoComponente,
          materiaPrimaId: c.materiaPrimaId,
          componenteProdutoId: c.componenteProdutoId,
          quantidade: c.quantidade,
        })),
        observacao: form.observacao || undefined,
      }

      const res = await fetch('/api/montagem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.detalhes) {
          const detalhe = data.detalhes.map((d: any) => `${d.nome || d.materiaPrimaId}: falta ${(d.falta || 0).toFixed(3)}`).join(', ')
          toast.error(`${data.error || 'Erro na montagem'}: ${detalhe}`)
        } else {
          toast.error(data.error || 'Erro na montagem')
        }
        return
      }

      toast.success(`Produto "${form.nome}" montado! Custo unitário: ${fmt(data.custoUnitario)}`)
      setForm({ nome: '', precoSugerido: '', precoVenda: '', qtdProduzir: '1', observacao: '' })
      setComponentes([])
      setPreview(null)
      carregarDados()
    } finally {
      setSalvando(false)
    }
  }

  // MPs únicas para dropdown (deduplica por nome)
  const mpsUnicas = Object.values(mps.reduce((acc: Record<string, MP & { estoqueTotal: number }>, m) => {
    if (!acc[m.nome]) acc[m.nome] = { ...m, estoqueTotal: m.estoqueLote }
    else acc[m.nome].estoqueTotal += m.estoqueLote
    return acc
  }, {}))

  // Filtra produtos disponíveis para ser componente (exclui o produto sendo criado)
  const produtosComponente = produtos.filter(p => p.nome.toLowerCase() !== form.nome.toLowerCase())

  // Sem componentes disponíveis para montar uma receita
  const semComponentesDisponiveis = mps.length === 0 && produtos.length === 0

  if (loading) {
    return (
      <div>
        <Header
          title="Montagem de Produto"
          subtitle="Carregando..."
        />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header
        title="Montagem de Produto"
        subtitle="Crie produtos novos ou produza mais do existente com controle FIFO"
      />

      {semComponentesDisponiveis ? (
        <div className="card">
          <EmptyState
            icon={Package}
            title="Nenhum componente disponível"
            description="Cadastre ao menos uma matéria-prima antes de montar um produto. Os componentes da receita (BOM) vêm da matéria-prima ou de outros produtos."
            action={
              <a href="/materia-prima" className="btn-primary">
                <Plus size={16} /> Cadastrar Matéria-Prima
              </a>
            }
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4 items-start">
          <div className="card">
            <h2 className="font-semibold text-gray-700 mb-4">Informações do Produto</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Produto *</label>
                <input type="text" className="input-field" value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: Caneca Personalizada, Banner 1m×1m..." />
                {produtoExistente && (
                  <p className="text-sm text-amber-600 mt-1">
                    ⚠️ Produto existente (estoque atual: {produtoExistente.estoque}) — será produzida mais quantidade.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Qtd a Produzir *</label>
                <input type="number" className="input-field" value={form.qtdProduzir} min="0.001" step="0.001"
                  onChange={e => setForm(f => ({ ...f, qtdProduzir: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preço de Venda (R$)</label>
                <input type="number" className="input-field" value={form.precoVenda} step="0.01"
                  onChange={e => setForm(f => ({ ...f, precoVenda: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preço Sugerido (R$)</label>
                <input type="number" className="input-field" value={form.precoSugerido} step="0.01"
                  onChange={e => setForm(f => ({ ...f, precoSugerido: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
                <input type="text" className="input-field" value={form.observacao}
                  onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} placeholder="Opcional" />
              </div>
            </div>
          </div>

          {/* Componentes */}
          <div className="card">
            <h2 className="font-semibold text-gray-700 mb-4">Componentes (Receita / BOM)</h2>

            {/* Adicionar componente */}
            <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
                <select className="input-field" value={novoComp.tipo} onChange={e => setNovoComp(c => ({ ...c, tipo: e.target.value as any, id: '' }))}>
                  <option value="MATERIA_PRIMA">Matéria-Prima</option>
                  <option value="PRODUTO">Produto (kit)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {novoComp.tipo === 'MATERIA_PRIMA' ? 'Material' : 'Produto'}
                </label>
                <select className="input-field" value={novoComp.id} onChange={e => setNovoComp(c => ({ ...c, id: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {novoComp.tipo === 'MATERIA_PRIMA'
                    ? mpsUnicas.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nome} ({m.unidade}) — {m.estoqueLote.toFixed(3)} disp.
                      </option>
                    ))
                    : produtosComponente.map(p => (
                      <option key={p.id} value={p.id}>{p.nome} — {p.estoque} disp.</option>
                    ))
                  }
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Qtd por Unidade</label>
                <div className="flex gap-2">
                  <input type="number" className="input-field" value={novoComp.qtd} step="0.001" min="0.001"
                    onChange={e => setNovoComp(c => ({ ...c, qtd: e.target.value }))}
                    placeholder="0.5" />
                  <button onClick={adicionarComponente} className="btn-primary px-3">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            {componentes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum componente adicionado</p>
            ) : (
              <table className="table-base">
                <thead><tr><th>Tipo</th><th>Material/Produto</th><th>Qtd por Unidade</th><th></th></tr></thead>
                <tbody>
                  {componentes.map((c, i) => (
                    <tr key={i}>
                      <td><span className={`text-xs px-2 py-0.5 rounded-full ${c.tipoComponente === 'MATERIA_PRIMA' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{c.tipoComponente === 'MATERIA_PRIMA' ? 'MP' : 'Kit'}</span></td>
                      <td className="font-medium">{c._nomeDisplay}</td>
                      <td>{c.quantidade}</td>
                      <td><button onClick={() => removerComponente(i)} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          </div>

          {/* Preview FIFO */}
          {preview && (
            <div className={`mb-4 ${preview.sucesso ? 'alert-success' : 'alert-danger'}`}>
              {preview.sucesso ? (
                <div>
                  <strong>✓ Estoque suficiente</strong>
                  <span className="ml-2">Custo estimado: {fmt(preview.custoTotal)} total · {fmt(preview.custoUnitario)} por unidade</span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 font-semibold mb-1"><AlertTriangle size={16} /> Estoque insuficiente</div>
                  {preview.faltaMP?.map((f: any) => (
                    <div key={f.materiaPrimaId} className="text-sm">• {f.nome}: falta {f.falta.toFixed(3)} (tem {f.disponivel.toFixed(3)})</div>
                  ))}
                  {preview.faltaProdutos?.map((f: any) => (
                    <div key={f.produtoId} className="text-sm">• {f.nome}: falta {f.falta} (tem {f.disponivel})</div>
                  ))}
                  {preview.maximoPossivel !== undefined && (
                    <div className="text-sm mt-1">Máximo possível: {preview.maximoPossivel} unidade(s)</div>
                  )}
                </div>
              )}
            </div>
          )}

          <button onClick={salvar} disabled={salvando} className="btn-primary w-full justify-center py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed">
            {salvando ? 'Processando...' : 'Confirmar Montagem e Produzir'}
          </button>
        </>
      )}
    </div>
  )
}
