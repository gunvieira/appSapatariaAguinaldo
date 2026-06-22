import { Timestamp } from 'firebase/firestore';

// ─── Formas de pagamento ───────────────────────────────────────────────────
export type FormaPagamento = 'dinheiro' | 'pix' | 'cartão';

// ─── Status da Ordem de Serviço ────────────────────────────────────────────
export type StatusOS = 'aguardando' | 'em_conserto' | 'pronto' | 'entregue';

// ─── Serviço do catálogo ou manual ────────────────────────────────────────
export interface Servico {
    id: string;
    descricao: string;
    valor: number;
}

// ─── Item dentro de uma OS ────────────────────────────────────────────────
export interface ItemOS {
    id: string;
    descricao: string;         // ex: "sapato social preto"
    servicos: Servico[];
    fotosEntrada: string[];    // URLs Firebase Storage — exige exatamente 2
    fotosSaida: string[];      // URLs Firebase Storage — exige exatamente 2
}

// ─── Cliente ───────────────────────────────────────────────────────────────
export interface Cliente {
    id: string;
    nome: string;
    whatsapp: string;
}

// ─── Ordem de Serviço ─────────────────────────────────────────────────────
export interface OrdemServico {
    id: string;
    clienteNome: string;
    clienteTelefone: string;
    clienteId?: string;        // ID do cliente na coleção 'clientes'
    status: StatusOS;
    itens: ItemOS[];
    sinal: number;             // valor pago na entrada
    saldo: number;             // valor a pagar na retirada
    formaPagamentoSinal: FormaPagamento;
    formaPagamentoSaldo?: FormaPagamento;
    observacao?: string;       // campo opcional
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// ─── Venda de balcão (PDV) ────────────────────────────────────────────────
export interface VendaBalcao {
    id: string;
    descricao: string;         // ex: "cadarço", "palmilha"
    valor: number;
    formaPagamento: FormaPagamento;
    createdAt: Timestamp;
}

// ─── Fechamento de caixa ──────────────────────────────────────────────────
export interface FechamentoCaixa {
    id: string;
    data: Timestamp;
    totalDinheiro: number;
    totalPix: number;
    totalCartao: number;
    totalGeral: number;
    quantidadeOS: number;
    quantidadeVendas: number;
}

// ─── Item do catálogo de serviços ─────────────────────────────────────────
export interface CatalogoServico {
    id: string;
    descricao: string;
    valorPadrao: number;
    ativo: boolean;
}

export interface DashboardMetrics {
    faturamentoHoje: number;
    osAguardando: number;
    osEmConserto: number;
    osPronto: number;
}

export interface ItemVenda {
    descricao: string;
    valor: number;
}

export interface VendaDiretaDoc {
    id: string;
    itens: ItemVenda[];
    valor_total: number;
    formaPagamento: FormaPagamento;
    createdAt: Timestamp;
}

export interface DadosCaixaDoDia {
    totalDinheiro: number;
    totalPix: number;
    totalCartao: number;
    totalGeral: number;
    quantidadeOS: number;
    quantidadeVendas: number;
}