-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "StatusProduto" AS ENUM ('ATIVO', 'INATIVO');

-- CreateEnum
CREATE TYPE "TipoComponente" AS ENUM ('MATERIA_PRIMA', 'PRODUTO');

-- CreateEnum
CREATE TYPE "StatusVenda" AS ENUM ('ATIVA', 'DEVOLVIDA');

-- CreateEnum
CREATE TYPE "TipoDescarte" AS ENUM ('MATERIA_PRIMA', 'PRODUTO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "papelaria" TEXT NOT NULL DEFAULT '3AJ Papelaria',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MateriaPrima" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "dataCompra" TIMESTAMP(3) NOT NULL,
    "qtdComprada" DOUBLE PRECISION NOT NULL,
    "unidPorItem" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "valorUnitario" DOUBLE PRECISION NOT NULL,
    "estoqueLote" DOUBLE PRECISION NOT NULL,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MateriaPrima_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipamento" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "dataCompra" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PecaReposicao" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "equipamentoId" TEXT,
    "nome" TEXT NOT NULL,
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "dataCompra" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PecaReposicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produto" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "custoUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "precoSugerido" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "precoVenda" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estoque" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "StatusProduto" NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EspecificacaoProduto" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "tipoComponente" "TipoComponente" NOT NULL,
    "materiaPrimaId" TEXT,
    "componenteProdutoId" TEXT,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EspecificacaoProduto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producao" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "quantidadeProduzida" DOUBLE PRECISION NOT NULL,
    "custoTotal" DOUBLE PRECISION NOT NULL,
    "custoUnitario" DOUBLE PRECISION NOT NULL,
    "dataProducao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Producao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumoProducao" (
    "id" TEXT NOT NULL,
    "producaoId" TEXT NOT NULL,
    "materiaPrimaId" TEXT NOT NULL,
    "qtdConsumida" DOUBLE PRECISION NOT NULL,
    "valorUnitario" DOUBLE PRECISION NOT NULL,
    "valorTotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ConsumoProducao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venda" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "produtoNome" TEXT NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "custoUnitario" DOUBLE PRECISION NOT NULL,
    "precoVenda" DOUBLE PRECISION NOT NULL,
    "taxaPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "servicoValor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGastos" DOUBLE PRECISION NOT NULL,
    "valorVenda" DOUBLE PRECISION NOT NULL,
    "lucro" DOUBLE PRECISION NOT NULL,
    "dataVenda" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "StatusVenda" NOT NULL DEFAULT 'ATIVA',
    "idempotencyKey" TEXT,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Venda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricoDescarte" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "TipoDescarte" NOT NULL,
    "materiaPrimaId" TEXT,
    "produtoId" TEXT,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "dataDescarte" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoDescarte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "MateriaPrima_userId_idx" ON "MateriaPrima"("userId");

-- CreateIndex
CREATE INDEX "MateriaPrima_userId_dataCompra_idx" ON "MateriaPrima"("userId", "dataCompra");

-- CreateIndex
CREATE INDEX "MateriaPrima_userId_estoqueLote_idx" ON "MateriaPrima"("userId", "estoqueLote");

-- CreateIndex
CREATE INDEX "Equipamento_userId_idx" ON "Equipamento"("userId");

-- CreateIndex
CREATE INDEX "Equipamento_userId_dataCompra_idx" ON "Equipamento"("userId", "dataCompra");

-- CreateIndex
CREATE INDEX "PecaReposicao_userId_idx" ON "PecaReposicao"("userId");

-- CreateIndex
CREATE INDEX "PecaReposicao_userId_dataCompra_idx" ON "PecaReposicao"("userId", "dataCompra");

-- CreateIndex
CREATE INDEX "Produto_userId_idx" ON "Produto"("userId");

-- CreateIndex
CREATE INDEX "Produto_userId_status_idx" ON "Produto"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Venda_idempotencyKey_key" ON "Venda"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Venda_userId_idx" ON "Venda"("userId");

-- CreateIndex
CREATE INDEX "Venda_userId_status_idx" ON "Venda"("userId", "status");

-- CreateIndex
CREATE INDEX "Venda_userId_dataVenda_idx" ON "Venda"("userId", "dataVenda");

-- CreateIndex
CREATE INDEX "HistoricoDescarte_userId_idx" ON "HistoricoDescarte"("userId");

-- CreateIndex
CREATE INDEX "HistoricoDescarte_userId_dataDescarte_idx" ON "HistoricoDescarte"("userId", "dataDescarte");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MateriaPrima" ADD CONSTRAINT "MateriaPrima_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipamento" ADD CONSTRAINT "Equipamento_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PecaReposicao" ADD CONSTRAINT "PecaReposicao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PecaReposicao" ADD CONSTRAINT "PecaReposicao_equipamentoId_fkey" FOREIGN KEY ("equipamentoId") REFERENCES "Equipamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EspecificacaoProduto" ADD CONSTRAINT "EspecificacaoProduto_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EspecificacaoProduto" ADD CONSTRAINT "EspecificacaoProduto_materiaPrimaId_fkey" FOREIGN KEY ("materiaPrimaId") REFERENCES "MateriaPrima"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EspecificacaoProduto" ADD CONSTRAINT "EspecificacaoProduto_componenteProdutoId_fkey" FOREIGN KEY ("componenteProdutoId") REFERENCES "Produto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producao" ADD CONSTRAINT "Producao_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumoProducao" ADD CONSTRAINT "ConsumoProducao_producaoId_fkey" FOREIGN KEY ("producaoId") REFERENCES "Producao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumoProducao" ADD CONSTRAINT "ConsumoProducao_materiaPrimaId_fkey" FOREIGN KEY ("materiaPrimaId") REFERENCES "MateriaPrima"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoDescarte" ADD CONSTRAINT "HistoricoDescarte_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoDescarte" ADD CONSTRAINT "HistoricoDescarte_materiaPrimaId_fkey" FOREIGN KEY ("materiaPrimaId") REFERENCES "MateriaPrima"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoDescarte" ADD CONSTRAINT "HistoricoDescarte_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

