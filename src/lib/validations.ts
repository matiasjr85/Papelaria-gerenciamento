import { z } from 'zod'

// Auth
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

export const cadastroSchema = z.object({
  nome: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  papelaria: z.string().min(2, 'Nome da papelaria muito curto'),
})

// Matéria Prima
export const materiaPrimaSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  unidade: z.string().min(1, 'Unidade obrigatória'),
  dataCompra: z.string().min(1, 'Data obrigatória'),
  qtdComprada: z.number().positive('Quantidade deve ser positiva'),
  unidPorItem: z.number().positive('Unidades por item deve ser positivo'),
  valorTotal: z.number().positive('Valor total deve ser positivo'),
  observacao: z.string().optional(),
})

// Equipamento
export const equipamentoSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  valorTotal: z.number().positive('Valor deve ser positivo'),
  dataCompra: z.string().min(1, 'Data obrigatória'),
  descricao: z.string().optional(),
})

// Peça de Reposição
export const pecaSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  valorTotal: z.number().positive('Valor deve ser positivo'),
  dataCompra: z.string().min(1, 'Data obrigatória'),
  equipamentoId: z.string().optional(),
  descricao: z.string().optional(),
})

// Produto / Montagem
export const componenteSchema = z.object({
  tipoComponente: z.enum(['MATERIA_PRIMA', 'PRODUTO']),
  materiaPrimaId: z.string().optional(),
  componenteProdutoId: z.string().optional(),
  quantidade: z.number().positive('Quantidade deve ser positiva'),
})

export const montagemSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  precoSugerido: z.number().min(0),
  precoVenda: z.number().min(0),
  qtdProduzir: z.number().positive('Quantidade a produzir deve ser positiva'),
  componentes: z.array(componenteSchema).min(1, 'Adicione pelo menos um componente'),
  observacao: z.string().optional(),
})

export const atualizarPrecoSchema = z.object({
  produtoId: z.string(),
  precoSugerido: z.number().min(0),
  precoVenda: z.number().min(0),
})

// Venda
export const vendaSchema = z.object({
  produtoId: z.string().min(1, 'Produto obrigatório'),
  quantidade: z.number().positive('Quantidade deve ser positiva'),
  taxaPct: z.number().min(0).max(100),
  servicoValor: z.number().min(0),
  observacao: z.string().optional(),
  idempotencyKey: z.string().optional(),
})

// Descarte
export const descarteSchema = z.object({
  tipo: z.enum(['MATERIA_PRIMA', 'PRODUTO']),
  materiaPrimaId: z.string().optional(),
  produtoId: z.string().optional(),
  quantidade: z.number().positive('Quantidade deve ser positiva'),
  motivo: z.string().optional(),
})
