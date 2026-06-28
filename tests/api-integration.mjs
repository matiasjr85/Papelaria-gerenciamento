/**
 * Suíte de integração — exercita TODOS os endpoints, métodos e fluxos de negócio.
 * Roda contra um servidor em http://localhost:3000 (npm run dev).
 *   node tests/api-integration.mjs
 */
const BASE = process.env.BASE || 'http://localhost:3000'

let pass = 0, fail = 0
const fails = []
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; fails.push(name + (extra ? ` — ${extra}` : '')); console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`) }
}
function section(t) { console.log(`\n=== ${t} ===`) }

function newSession() { return { cookie: '' } }
async function call(sess, method, path, body, opts = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (sess?.cookie) headers['Cookie'] = sess.cookie
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: opts.redirect || 'manual',
  })
  // captura cookie de sessão
  const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : []
  for (const c of setCookies) {
    if (c.startsWith('3aj_session=')) sess.cookie = c.split(';')[0]
  }
  let data = null
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) { try { data = await res.json() } catch {} }
  return { status: res.status, data }
}
const iso = (d) => d.toISOString()
const today = new Date()
const monthsAgo = (n) => new Date(today.getFullYear(), today.getMonth() - n, 10)

async function main() {
  const stamp = Date.now()
  const u1 = newSession(), u2 = newSession(), anon = newSession()
  const email1 = `t1_${stamp}@test.com`, email2 = `t2_${stamp}@test.com`

  // ---------------------------------------------------------------- AUTH
  section('AUTH')
  let r = await call(u1, 'POST', '/api/auth/register', { nome: 'Tester 1', email: email1, password: 'senha123', papelaria: 'Loja T1' })
  ok('register user1 (200)', r.status === 200, `status=${r.status}`)
  ok('register seta cookie de sessão', !!u1.cookie)

  r = await call(u1, 'GET', '/api/auth/me')
  ok('GET /me autenticado (200)', r.status === 200 && r.data?.user?.email === email1, `status=${r.status} email=${r.data?.user?.email}`)

  r = await call(anon, 'GET', '/api/auth/me')
  ok('GET /me sem auth (401)', r.status === 401, `status=${r.status}`)

  r = await call(anon, 'POST', '/api/auth/login', { email: email1, password: 'ERRADA' })
  ok('login senha errada (401)', r.status === 401, `status=${r.status}`)

  r = await call(anon, 'GET', '/api/materia-prima')
  ok('API protegida sem auth (401)', r.status === 401, `status=${r.status}`)

  r = await call(anon, 'GET', '/dashboard', undefined, { redirect: 'manual' })
  ok('rota protegida redireciona (307/302)', r.status === 307 || r.status === 302, `status=${r.status}`)

  // login válido (sessão fresca) reaproveita u1
  r = await call(u1, 'POST', '/api/auth/login', { email: email1, password: 'senha123' })
  ok('login válido (200)', r.status === 200, `status=${r.status}`)

  // ---------------------------------------------------------------- VALIDAÇÃO (Zod)
  section('VALIDAÇÃO (Zod 400)')
  r = await call(u1, 'POST', '/api/auth/register', { nome: 'X', email: 'invalido', password: '123', papelaria: 'Y' })
  ok('register email inválido (400)', r.status === 400, `status=${r.status}`)
  r = await call(u1, 'POST', '/api/materia-prima', { nome: 'N', unidade: 'un', dataCompra: iso(today), qtdComprada: -5, unidPorItem: 1, valorTotal: 10 })
  ok('MP qtd negativa (400)', r.status === 400, `status=${r.status}`)
  r = await call(u1, 'POST', '/api/vendas', { produtoId: 'x', quantidade: 0, taxaPct: 0, servicoValor: 0 })
  ok('venda quantidade 0 (400)', r.status === 400, `status=${r.status}`)

  // ---------------------------------------------------------------- MATÉRIA-PRIMA CRUD
  section('MATÉRIA-PRIMA CRUD')
  r = await call(u1, 'POST', '/api/materia-prima', { nome: 'Papel A4', unidade: 'folha', dataCompra: iso(monthsAgo(2)), qtdComprada: 10, unidPorItem: 1, valorTotal: 50 })
  const loteId = r.data?.id
  ok('cria lote (200/201)', (r.status === 200 || r.status === 201) && !!loteId, `status=${r.status}`)
  ok('valorUnitario calculado = 5', r.data?.valorUnitario === 5, `vu=${r.data?.valorUnitario}`)
  ok('estoqueLote = 10', r.data?.estoqueLote === 10, `el=${r.data?.estoqueLote}`)

  // lote descartável (será deletado)
  r = await call(u1, 'POST', '/api/materia-prima', { nome: 'Tinta', unidade: 'ml', dataCompra: iso(today), qtdComprada: 4, unidPorItem: 1, valorTotal: 20 })
  const loteDelId = r.data?.id
  ok('cria 2º lote', !!loteDelId)

  r = await call(u1, 'GET', '/api/materia-prima')
  ok('lista MP contém os 2 lotes', Array.isArray(r.data) && r.data.length >= 2, `len=${r.data?.length}`)

  r = await call(u1, 'PUT', `/api/materia-prima/${loteId}`, { nome: 'Papel A4 Premium', unidade: 'folha', dataCompra: iso(monthsAgo(2)), qtdComprada: 10, unidPorItem: 1, valorTotal: 60 })
  ok('PUT atualiza lote (vu=6)', r.status === 200 && r.data?.valorUnitario === 6, `status=${r.status} vu=${r.data?.valorUnitario}`)

  r = await call(u1, 'DELETE', `/api/materia-prima/${loteDelId}`)
  ok('DELETE lote intacto (200)', r.status === 200, `status=${r.status}`)

  // ---------------------------------------------------------------- EQUIPAMENTOS CRUD
  section('EQUIPAMENTOS CRUD')
  r = await call(u1, 'POST', '/api/equipamentos', { nome: 'Impressora', valorTotal: 1200, dataCompra: iso(today), descricao: 'Laser' })
  const equipId = r.data?.id
  ok('cria equipamento', (r.status === 200 || r.status === 201) && !!equipId, `status=${r.status}`)
  r = await call(u1, 'GET', '/api/equipamentos')
  ok('lista equipamentos', Array.isArray(r.data) && r.data.length >= 1)
  r = await call(u1, 'PUT', `/api/equipamentos/${equipId}`, { nome: 'Impressora Pro', valorTotal: 1500, dataCompra: iso(today) })
  ok('PUT equipamento (200)', r.status === 200, `status=${r.status}`)

  // ---------------------------------------------------------------- PEÇAS CRUD
  section('PEÇAS DE REPOSIÇÃO CRUD')
  r = await call(u1, 'POST', '/api/pecas', { nome: 'Toner', valorTotal: 90, dataCompra: iso(today), equipamentoId: equipId })
  const pecaId = r.data?.id
  ok('cria peça', (r.status === 200 || r.status === 201) && !!pecaId, `status=${r.status}`)
  r = await call(u1, 'PUT', `/api/pecas/${pecaId}`, { nome: 'Toner XL', valorTotal: 120, dataCompra: iso(today), equipamentoId: equipId })
  ok('PUT peça (200)', r.status === 200, `status=${r.status}`)
  r = await call(u1, 'DELETE', `/api/pecas/${pecaId}`)
  ok('DELETE peça (200)', r.status === 200, `status=${r.status}`)

  // ---------------------------------------------------------------- MONTAGEM / PRODUÇÃO
  section('MONTAGEM / PRODUÇÃO (consumo de MP)')
  // BOM: 2 unidades de MP (loteId) por produto. Produz 3 → consome 6. custoUnit = 6×6/3? não: 6 MP × vu6 = 36, /3 = 12
  r = await call(u1, 'POST', '/api/montagem', {
    nome: 'Cartão de Visita', precoSugerido: 20, precoVenda: 25, qtdProduzir: 3,
    componentes: [{ tipoComponente: 'MATERIA_PRIMA', materiaPrimaId: loteId, quantidade: 2 }],
  })
  ok('produz produto novo (201)', r.status === 201, `status=${r.status}`)
  ok('custoUnitario = 12 (6MP×6 /3)', Math.abs((r.data?.custoUnitario ?? 0) - 12) < 0.01, `cu=${r.data?.custoUnitario}`)

  r = await call(u1, 'GET', '/api/materia-prima')
  const loteAtual = r.data?.find(l => l.id === loteId)
  ok('estoqueLote após produção = 4 (10-6)', loteAtual?.estoqueLote === 4, `el=${loteAtual?.estoqueLote}`)

  r = await call(u1, 'GET', '/api/produtos')
  const prod = r.data?.find?.(p => p.nome === 'Cartão de Visita') || r.data?.produtos?.find?.(p => p.nome === 'Cartão de Visita')
  const prodId = prod?.id
  ok('produto aparece na lista, estoque=3', !!prodId && prod?.estoque === 3, `estoque=${prod?.estoque}`)

  // produzir mais (mesmo nome) → +1 unidade, consome +2 MP
  r = await call(u1, 'POST', '/api/montagem', {
    nome: 'Cartão de Visita', precoSugerido: 20, precoVenda: 25, qtdProduzir: 1,
    componentes: [{ tipoComponente: 'MATERIA_PRIMA', materiaPrimaId: loteId, quantidade: 2 }],
  })
  ok('produzir mais (201)', r.status === 201, `status=${r.status}`)
  r = await call(u1, 'GET', '/api/materia-prima')
  ok('estoqueLote = 2 (4-2)', r.data?.find(l => l.id === loteId)?.estoqueLote === 2)

  // estoque insuficiente: produzir 100 → precisa 200 MP, só há 2
  r = await call(u1, 'POST', '/api/montagem', {
    nome: 'Cartão de Visita', precoSugerido: 20, precoVenda: 25, qtdProduzir: 100,
    componentes: [{ tipoComponente: 'MATERIA_PRIMA', materiaPrimaId: loteId, quantidade: 2 }],
  })
  ok('produção sem estoque (409)', r.status === 409, `status=${r.status}`)

  // preview GET montagem
  r = await call(u1, 'GET', `/api/montagem?produtoId=${prodId}&quantidade=1`)
  ok('GET montagem preview (200)', r.status === 200 && typeof r.data?.custoUnitario === 'number', `status=${r.status}`)

  // ---------------------------------------------------------------- PRODUTOS detalhe / BOM / preço
  section('PRODUTOS (detalhe, preço, BOM, status)')
  r = await call(u1, 'GET', `/api/produtos/${prodId}`)
  ok('GET produto detalhe + BOM', r.status === 200 && Array.isArray(r.data?.especificacoes), `status=${r.status}`)
  r = await call(u1, 'PATCH', `/api/produtos/${prodId}`, { precoVenda: 30 })
  ok('PATCH preço (200, precoVenda=30)', r.status === 200 && r.data?.precoVenda === 30, `status=${r.status}`)
  r = await call(u1, 'PUT', `/api/produtos/${prodId}/bom`, { componentes: [{ tipoComponente: 'MATERIA_PRIMA', materiaPrimaId: loteId, quantidade: 1 }] })
  ok('PUT BOM (200)', r.status === 200, `status=${r.status}`)
  r = await call(u1, 'DELETE', `/api/produtos/${prodId}`)
  ok('DELETE produto com estoque (409)', r.status === 409, `status=${r.status}`)

  // ---------------------------------------------------------------- VENDAS
  section('VENDAS (preview, idempotência, devolução)')
  r = await call(u1, 'GET', `/api/vendas?produtoId=${prodId}&quantidade=2&taxaPct=10&servicoValor=1`)
  ok('preview venda (200, lucro calculado)', r.status === 200 && r.data?.valorVenda === 60, `vv=${r.data?.valorVenda}`) // 30×2
  const idemKey = `idem_${stamp}`
  r = await call(u1, 'POST', '/api/vendas', { produtoId: prodId, quantidade: 2, taxaPct: 10, servicoValor: 1, idempotencyKey: idemKey })
  ok('registra venda (201)', r.status === 201, `status=${r.status}`)
  const vendaId = r.data?.venda?.id
  ok('snapshot lucro = 53 (60 - (6+1))', Math.abs((r.data?.venda?.lucro ?? 0) - 53) < 0.01, `lucro=${r.data?.venda?.lucro}`)

  r = await call(u1, 'POST', '/api/vendas', { produtoId: prodId, quantidade: 2, taxaPct: 10, servicoValor: 1, idempotencyKey: idemKey })
  ok('idempotência: 2º POST mesma key = duplicata', r.data?.duplicata === true, `dup=${r.data?.duplicata}`)

  r = await call(u1, 'GET', '/api/produtos')
  const prodAfter = (r.data.produtos || r.data).find(p => p.id === prodId)
  ok('estoque após venda = 2 (4-2)', prodAfter?.estoque === 2, `estoque=${prodAfter?.estoque}`)

  r = await call(u1, 'GET', '/api/vendas?page=1&limit=10')
  ok('lista vendas paginada', Array.isArray(r.data?.vendas) && typeof r.data?.pages === 'number', `pages=${r.data?.pages}`)

  r = await call(u1, 'POST', '/api/vendas', { produtoId: prodId, quantidade: 999, taxaPct: 0, servicoValor: 0 })
  ok('venda sem estoque (409)', r.status === 409, `status=${r.status}`)

  r = await call(u1, 'POST', `/api/vendas/${vendaId}/devolucao`)
  ok('devolução (200)', r.status === 200, `status=${r.status}`)
  r = await call(u1, 'GET', '/api/produtos')
  ok('estoque restaurado = 4', (r.data.produtos || r.data).find(p => p.id === prodId)?.estoque === 4)
  r = await call(u1, 'POST', `/api/vendas/${vendaId}/devolucao`)
  ok('devolução repetida (409)', r.status === 409, `status=${r.status}`)

  // ---------------------------------------------------------------- DESCARTES
  section('DESCARTES')
  r = await call(u1, 'POST', '/api/descartes', { tipo: 'MATERIA_PRIMA', materiaPrimaId: loteId, quantidade: 1, motivo: 'Avaria' })
  ok('descarte MP (201)', r.status === 201, `status=${r.status}`)
  r = await call(u1, 'GET', '/api/materia-prima')
  ok('estoqueLote após descarte = 1 (2-1)', r.data.find(l => l.id === loteId)?.estoqueLote === 1)
  r = await call(u1, 'POST', '/api/descartes', { tipo: 'PRODUTO', produtoId: prodId, quantidade: 1, motivo: 'Defeito' })
  ok('descarte PRODUTO (201)', r.status === 201, `status=${r.status}`)
  r = await call(u1, 'POST', '/api/descartes', { tipo: 'MATERIA_PRIMA', materiaPrimaId: loteId, quantidade: 999 })
  ok('descarte sem estoque (409)', r.status === 409, `status=${r.status}`)
  r = await call(u1, 'GET', '/api/descartes')
  ok('lista descartes (>=2)', Array.isArray(r.data) && r.data.length >= 2, `len=${r.data?.length}`)

  // ---------------------------------------------------------------- PRODUZIR MAIS (via Produtos, BOM salvo)
  section('PRODUZIR MAIS (endpoint /produtos/[id]/produzir)')
  // BOM foi alterado p/ 1 MP por unidade; lote tem 1 disponível neste ponto
  r = await call(u1, 'GET', '/api/materia-prima')
  const loteAntes = r.data.find(l => l.id === loteId)?.estoqueLote
  r = await call(u1, 'POST', `/api/produtos/${prodId}/produzir`, { quantidade: 1 })
  ok('produzir +1 usando BOM salvo (201)', r.status === 201, `status=${r.status}`)
  r = await call(u1, 'GET', '/api/produtos')
  const estoqueDepois = (r.data.produtos || r.data).find(p => p.id === prodId)?.estoque
  ok('estoque do produto incrementou', estoqueDepois === 4, `estoque=${estoqueDepois}`)
  r = await call(u1, 'GET', '/api/materia-prima')
  ok('MP consumida via FIFO (lote -1)', r.data.find(l => l.id === loteId)?.estoqueLote === loteAntes - 1)
  r = await call(u1, 'POST', `/api/produtos/${prodId}/produzir`, { quantidade: 9999 })
  ok('produzir sem MP suficiente (409)', r.status === 409, `status=${r.status}`)
  r = await call(u1, 'POST', `/api/produtos/${prodId}/produzir`, { quantidade: 0 })
  ok('produzir quantidade 0 (400)', r.status === 400, `status=${r.status}`)

  // ---------------------------------------------------------------- FILTROS DE VENDAS
  section('FILTROS DE VENDAS (produto + data)')
  r = await call(u1, 'GET', `/api/vendas?produtoId=${prodId}`)
  ok('filtro por produto retorna só do produto', Array.isArray(r.data?.vendas) && r.data.vendas.length >= 1 && r.data.vendas.every(v => v.produtoId === prodId), `len=${r.data?.vendas?.length}`)
  r = await call(u1, 'GET', `/api/vendas?produtoId=inexistente123`)
  ok('filtro por produto inexistente = vazio', r.data?.vendas?.length === 0, `len=${r.data?.vendas?.length}`)
  const hojeStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  r = await call(u1, 'GET', `/api/vendas?data=${hojeStr}`)
  ok('filtro por data de hoje retorna venda', r.data?.vendas?.length >= 1, `len=${r.data?.vendas?.length}`)
  r = await call(u1, 'GET', `/api/vendas?data=2000-01-01`)
  ok('filtro por data antiga = vazio', r.data?.vendas?.length === 0, `len=${r.data?.vendas?.length}`)

  // ---------------------------------------------------------------- DASHBOARD
  section('DASHBOARD')
  r = await call(u1, 'GET', `/api/dashboard?ano=${today.getFullYear()}`)
  ok('dashboard KPIs (200)', r.status === 200 && r.data?.kpis && Array.isArray(r.data?.meses) && r.data.meses.length === 12, `status=${r.status}`)
  r = await call(u1, 'GET', `/api/dashboard?ano=${today.getFullYear()}&mes=${today.getMonth() + 1}`)
  ok('dashboard filtro por mês (200)', r.status === 200, `status=${r.status}`)
  r = await call(u1, 'GET', `/api/dashboard?ano=${today.getFullYear()}&investimentos=false`)
  ok('dashboard sem investimentos (equip=0)', r.status === 200 && r.data?.kpis?.totalEquipamentos === 0, `eq=${r.data?.kpis?.totalEquipamentos}`)

  // ---------------------------------------------------------------- MULTI-TENANT
  section('MULTI-TENANT (isolamento)')
  await call(u2, 'POST', '/api/auth/register', { nome: 'Tester 2', email: email2, password: 'senha123', papelaria: 'Loja T2' })
  r = await call(u2, 'GET', '/api/materia-prima')
  ok('user2 NÃO vê lotes do user1', Array.isArray(r.data) && !r.data.some(l => l.id === loteId), `len=${r.data?.length}`)
  r = await call(u2, 'GET', `/api/produtos/${prodId}`)
  ok('user2 GET produto do user1 (404)', r.status === 404, `status=${r.status}`)
  r = await call(u2, 'DELETE', `/api/materia-prima/${loteId}`)
  ok('user2 DELETE lote do user1 (404)', r.status === 404, `status=${r.status}`)
  r = await call(u2, 'POST', `/api/vendas/${vendaId}/devolucao`)
  ok('user2 devolver venda do user1 (404)', r.status === 404, `status=${r.status}`)

  // ---------------------------------------------------------------- MÉTODO NÃO PERMITIDO
  section('MÉTODO HTTP NÃO PERMITIDO')
  r = await call(u1, 'DELETE', '/api/auth/login')
  ok('DELETE em rota só-POST (405)', r.status === 405, `status=${r.status}`)
  r = await call(u1, 'PUT', '/api/dashboard')
  ok('PUT em rota só-GET (405)', r.status === 405, `status=${r.status}`)

  // ---------------------------------------------------------------- LOGOUT
  section('LOGOUT')
  r = await call(u1, 'POST', '/api/auth/logout')
  ok('logout (200)', r.status === 200, `status=${r.status}`)
  r = await call(u1, 'GET', '/api/auth/me')
  ok('após logout /me (401)', r.status === 401, `status=${r.status}`)

  // ---------------------------------------------------------------- RESUMO
  console.log(`\n========================================`)
  console.log(`  RESULTADO: ${pass} passaram, ${fail} falharam`)
  if (fails.length) { console.log('  Falhas:'); fails.forEach(f => console.log('   - ' + f)) }
  console.log(`========================================`)
  process.exit(fail > 0 ? 1 : 0)
}

main().catch(e => { console.error('ERRO FATAL:', e); process.exit(2) })
