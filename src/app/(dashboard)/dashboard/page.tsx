'use client'

import { useState, useEffect } from 'react'
import { SkeletonKpiGrid, SkeletonTable } from '@/components/feedback/Skeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  ShoppingCart, TrendingUp, DollarSign, Percent,
  Package, CalendarDays, Trophy, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtPct(v: number) { return v.toFixed(1) + '%' }
function fmtK(v: number) {
  if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(1)}k`
  return `R$${v.toFixed(0)}`
}

interface DashData {
  kpis: {
    totalVendas: number; totalGastos: number; lucro: number; margem: number
    qtdVendas: number; totalMP: number; totalTaxas: number
    totalEquipamentos: number; totalPecas: number
  }
  meses: Array<{
    mes: number; vendas: number; taxas: number; equipamentos: number
    pecas: number; materiaPrima: number; totalGastos: number
    lucro: number; margem: number; qtdVendas: number
  }>
  topProdutos: Array<{ produtoNome: string; _sum: { valorVenda: number; quantidade: number } }>
}

function KpiCard({
  label, value, sub, accent, icon: Icon, trend,
}: {
  label: string; value: string; sub: string
  accent: string; icon: typeof ShoppingCart; trend?: 'up' | 'down' | 'neutral'
}) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      {/* Faixa colorida no topo */}
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: accent }} />

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${accent}18`, color: accent }}
        >
          <Icon size={18} strokeWidth={2} />
        </div>
      </div>

      <div>
        <div className="text-2xl font-bold tracking-tight" style={{ color: accent }}>
          {value}
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          {trend === 'up' && <ArrowUpRight size={13} style={{ color: 'var(--success)' }} />}
          {trend === 'down' && <ArrowDownRight size={13} style={{ color: 'var(--danger)' }} />}
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</span>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const anoAtual = new Date().getFullYear()
  const [ano, setAno] = useState(anoAtual)
  const [mes, setMes] = useState<number | null>(null)
  const [investimentos, setInvestimentos] = useState(true)
  const [dados, setDados] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)

  const carregar = () => {
    setLoading(true); setErro(false)
    const params = new URLSearchParams({ ano: String(ano), investimentos: String(investimentos), ...(mes ? { mes: String(mes) } : {}) })
    fetch(`/api/dashboard?${params}`, { credentials: 'include' })
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => setDados(d))
      .catch(() => setErro(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true); setErro(false)
    const params = new URLSearchParams({ ano: String(ano), investimentos: String(investimentos), ...(mes ? { mes: String(mes) } : {}) })
    fetch(`/api/dashboard?${params}`, { credentials: 'include' })
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => { if (!cancelled) setDados(d) })
      .catch(() => { if (!cancelled) setErro(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [ano, mes, investimentos])

  const kpis = dados?.kpis
  const meses = dados?.meses || []
  const topProdutos = dados?.topProdutos || []
  const chartData = meses.map(m => ({ ...m, nome: MESES[m.mes - 1] }))
  const mesComDados = meses.filter(m => m.vendas > 0 || m.totalGastos > 0)

  return (
    <div className="space-y-5">
      {/* Header compacto com filtros inline */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Dashboard</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Visão financeira da papelaria</p>
        </div>
        {/* Filtros compactos */}
        <div
          className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <CalendarDays size={14} style={{ color: 'var(--text-muted)' }} />
          <select
            className="text-sm font-medium border-none outline-none bg-transparent cursor-pointer"
            style={{ color: 'var(--text)' }}
            value={ano}
            onChange={e => setAno(Number(e.target.value))}
          >
            {[anoAtual - 2, anoAtual - 1, anoAtual, anoAtual + 1].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
          <select
            className="text-sm border-none outline-none bg-transparent cursor-pointer"
            style={{ color: 'var(--text)' }}
            value={mes || ''}
            onChange={e => setMes(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Ano todo</option>
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
          <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none" style={{ color: 'var(--text-muted)' }}>
            <div
              className="relative w-8 h-4 rounded-full flex-shrink-0 transition-colors"
              style={{ background: investimentos ? '#E91E8C' : 'var(--border)', transition: 'background 0.2s' }}
              onClick={() => setInvestimentos(v => !v)}
            >
              <div
                className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform"
                style={{ transform: investimentos ? 'translateX(1rem)' : 'translateX(0.125rem)' }}
              />
            </div>
            <span>Investimentos</span>
          </label>
        </div>
      </div>

      {/* Estado de erro */}
      {erro && !loading && <ErrorState message="Não foi possível carregar os dados." onRetry={carregar} />}

      {/* KPI Cards — 4 colunas */}
      {loading ? (
        <SkeletonKpiGrid />
      ) : kpis && !erro ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <KpiCard
            label="Receita Total" value={fmt(kpis.totalVendas)} sub={`${kpis.qtdVendas} venda(s) no período`}
            accent="#29ABE2" icon={ShoppingCart} trend={kpis.totalVendas > 0 ? 'up' : 'neutral'}
          />
          <KpiCard
            label="Total de Gastos" value={fmt(kpis.totalGastos)}
            sub={`MP + Taxas${investimentos ? ' + Equip/Peças' : ''}`}
            accent="#FFD700" icon={DollarSign}
          />
          <KpiCard
            label="Lucro Líquido" value={fmt(kpis.lucro)} sub="Receita menos todos os gastos"
            accent={kpis.lucro >= 0 ? '#16A34A' : '#DC2626'} icon={TrendingUp}
            trend={kpis.lucro >= 0 ? 'up' : 'down'}
          />
          <KpiCard
            label="Margem de Lucro" value={fmtPct(kpis.margem)} sub="Lucro ÷ Receita × 100"
            accent="#E91E8C" icon={Percent}
            trend={kpis.margem >= 20 ? 'up' : kpis.margem >= 0 ? 'neutral' : 'down'}
          />
        </div>
      ) : null}

      {/* Linha 2: Gráfico grande + Painel lateral */}
      {!loading && !erro && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* Gráfico — 2/3 */}
          <div
            className="xl:col-span-2 rounded-xl border p-5"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Evolução Mensal</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {mesComDados.length > 0 ? `${mesComDados.length} meses com movimentação` : 'Sem dados no período'}
                </p>
              </div>
              {/* Mini legenda */}
              <div className="hidden sm:flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#29ABE2' }} />Vendas</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#FFD700' }} />Gastos</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#16A34A' }} />Lucro</span>
              </div>
            </div>
            {mesComDados.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} barCategoryGap="30%" barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="nome" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={fmtK} axisLine={false} tickLine={false} width={52} />
                  <Tooltip
                    formatter={(v) => fmt(Number(v))}
                    contentStyle={{
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: '8px', color: 'var(--text)', fontSize: 12, boxShadow: 'var(--shadow-lg)',
                    }}
                    cursor={{ fill: 'var(--bg-subtle)' }}
                  />
                  <Bar dataKey="vendas" name="Vendas" fill="#29ABE2" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalGastos" name="Gastos" fill="#FFD700" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lucro" name="Lucro" fill="#16A34A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px]" style={{ color: 'var(--text-muted)' }}>
                <Package size={40} className="mb-3 opacity-20" />
                <p className="text-sm">Nenhum dado para o período selecionado</p>
                <p className="text-xs mt-1 opacity-70">Registre vendas para ver o gráfico</p>
              </div>
            )}
          </div>

          {/* Painel lateral — 1/3 */}
          <div className="flex flex-col gap-3">

            {/* Top Produtos */}
            <div
              className="flex-1 rounded-xl border p-5"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Trophy size={16} style={{ color: '#E91E8C' }} />
                <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Top Produtos</h2>
              </div>

              {topProdutos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Package size={28} className="mb-2 opacity-20" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Nenhuma venda no período</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topProdutos.slice(0, 8).map((p, i) => {
                    const max = topProdutos[0]._sum.valorVenda || 1
                    const pct = (p._sum.valorVenda / max) * 100
                    const colors = ['#E91E8C', '#29ABE2', '#FFD700', '#16A34A', '#E91E8C', '#29ABE2', '#FFD700', '#16A34A']
                    return (
                      <div key={p.produtoNome} className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                              style={{ background: `${colors[i]}20`, color: colors[i] }}
                            >
                              {i + 1}
                            </span>
                            <span className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>
                              {p.produtoNome}
                            </span>
                          </div>
                          <span className="text-xs font-bold flex-shrink-0" style={{ color: colors[i] }}>
                            {fmt(p._sum.valorVenda)}
                          </span>
                        </div>
                        <div className="h-1 rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                          <div
                            className="h-1 rounded-full"
                            style={{ width: `${pct}%`, background: colors[i], transition: 'width 0.6s ease' }}
                          />
                        </div>
                        <p className="text-[10px]" style={{ color: 'var(--text-subtle)' }}>
                          {p._sum.quantidade} unidade(s)
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Sumário rápido de gastos */}
            {kpis && (kpis.totalMP > 0 || kpis.totalTaxas > 0) && (
              <div
                className="rounded-xl border p-4"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                <h3 className="font-semibold text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                  Composição dos Gastos
                </h3>
                <div className="space-y-2">
                  {[
                    { label: 'Matéria-Prima', value: kpis.totalMP, color: '#29ABE2' },
                    { label: 'Taxas / Serviços', value: kpis.totalTaxas, color: '#E91E8C' },
                    ...(investimentos ? [
                      { label: 'Equipamentos', value: kpis.totalEquipamentos, color: '#FFD700' },
                      { label: 'Peças', value: kpis.totalPecas, color: '#16A34A' },
                    ] : []),
                  ].filter(g => g.value > 0).map(g => (
                    <div key={g.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: g.color }} />
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{g.label}</span>
                      </div>
                      <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{fmt(g.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resumo Mensal — tabela completa */}
      {loading ? (
        <SkeletonTable rows={6} cols={8} />
      ) : !erro && meses.length > 0 ? (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Resumo Mensal — {ano}</h2>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {mesComDados.length} meses com dados
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>Vendas</th>
                  <th>Taxas</th>
                  {investimentos && <><th>Equip.</th><th>Peças</th></>}
                  <th>Mat.Prima</th>
                  <th>Total Gastos</th>
                  <th>Lucro</th>
                  <th>Margem</th>
                </tr>
              </thead>
              <tbody>
                {meses.map(m => (
                  <tr key={m.mes} style={{ opacity: m.vendas === 0 && m.totalGastos === 0 ? 0.4 : 1 }}>
                    <td className="font-semibold text-xs" style={{ color: 'var(--text)' }}>{MESES[m.mes - 1]}</td>
                    <td className="font-semibold" style={{ color: '#29ABE2' }}>{fmt(m.vendas)}</td>
                    <td>{fmt(m.taxas)}</td>
                    {investimentos && <><td>{fmt(m.equipamentos)}</td><td>{fmt(m.pecas)}</td></>}
                    <td>{fmt(m.materiaPrima)}</td>
                    <td>{fmt(m.totalGastos)}</td>
                    <td className="font-bold" style={{ color: m.lucro >= 0 ? '#16A34A' : '#DC2626' }}>
                      {fmt(m.lucro)}
                    </td>
                    <td style={{ color: m.margem < 0 ? '#DC2626' : 'var(--text-muted)' }}>
                      {fmtPct(m.margem)}
                    </td>
                  </tr>
                ))}
                {/* Linha de total */}
                {kpis && (
                  <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--bg-subtle)' }}>
                    <td className="font-bold text-xs">TOTAL</td>
                    <td className="font-bold" style={{ color: '#29ABE2' }}>{fmt(kpis.totalVendas)}</td>
                    <td className="font-bold">{fmt(kpis.totalTaxas)}</td>
                    {investimentos && <><td className="font-bold">{fmt(kpis.totalEquipamentos)}</td><td className="font-bold">{fmt(kpis.totalPecas)}</td></>}
                    <td className="font-bold">{fmt(kpis.totalMP)}</td>
                    <td className="font-bold">{fmt(kpis.totalGastos)}</td>
                    <td className="font-bold" style={{ color: kpis.lucro >= 0 ? '#16A34A' : '#DC2626' }}>{fmt(kpis.lucro)}</td>
                    <td className="font-bold">{fmtPct(kpis.margem)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
