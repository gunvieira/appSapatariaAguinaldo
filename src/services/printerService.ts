// src/services/printerService.ts
// Serviço de impressão Bluetooth para impressoras térmicas ESC/POS (58mm / 32 colunas)
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FechamentoCaixa } from '../types';

const MAC_STORAGE_KEY = '@sapataria_impressora_mac';

// ─── Comandos ESC/POS ─────────────────────────────────────────────────────────
const CMD = {
    CENTER:   '\x1b\x61\x01',   // Alinhar ao centro
    LEFT:     '\x1b\x61\x00',   // Alinhar à esquerda
    BOLD_ON:  '\x1bE\x01',      // Negrito ligado
    BOLD_OFF: '\x1bE\x00',      // Negrito desligado
    NORMAL:   '\x1d!\x00',      // Tamanho de fonte normal
    DOUBLE:   '\x1d!\x11',      // Fonte dupla (altura + largura)
    LF:       '\n',              // Quebra de linha
    SEP:      '--------------------------------\n', // Separador 32 colunas (58mm)
};

// ─── Interfaces de dados para impressão ──────────────────────────────────────
// Usamos interfaces próprias para não acoplar o serviço de impressão
// aos tipos do Firestore, permitindo uso em qualquer contexto.

export interface OSPrintData {
    id: string;
    clienteNome: string;
    clienteTelefone?: string;
    itens: Array<{
        descricao: string;
        servicos: Array<{ descricao: string; valor: number }>;
    }>;
    sinal: number;
    saldo: number;
    formaPagamentoSinal: string;
    createdAt?: { toDate?: () => Date };
}

export interface VendaDiretaPrintData {
    itens: Array<{ descricao: string; valor: number }>;
    valor_total: number;
    formaPagamento: string;
    createdAt?: { toDate?: () => Date };
}

// ─── Persistência do MAC da impressora via AsyncStorage ───────────────────────
export async function salvarMacImpressora(mac: string): Promise<void> {
    try {
        await AsyncStorage.setItem(MAC_STORAGE_KEY, mac);
    } catch (e) {
        console.error('Erro ao salvar MAC da impressora:', e);
    }
}

export async function getMacImpressora(): Promise<string | null> {
    try {
        return await AsyncStorage.getItem(MAC_STORAGE_KEY);
    } catch (e) {
        console.error('Erro ao ler MAC da impressora:', e);
        return null;
    }
}

export async function limparMacImpressora(): Promise<void> {
    try {
        await AsyncStorage.removeItem(MAC_STORAGE_KEY);
    } catch (e) {
        console.error('Erro ao limpar MAC da impressora:', e);
    }
}

// ─── Utilitário: linha com nome à esquerda e valor à direita ─────────────────
const formatLinha = (nome: string, valor: number, maxWidth = 32): string => {
    const valorStr = `R$ ${valor.toFixed(2).replace('.', ',')}`;
    const maxNome = maxWidth - valorStr.length - 1;
    const nomeFormatado = nome.length > maxNome ? nome.substring(0, maxNome) : nome;
    const espacos = maxWidth - nomeFormatado.length - valorStr.length;
    return nomeFormatado + ' '.repeat(Math.max(0, espacos)) + valorStr + '\n';
};

// ─── Utilitário: formatar data de um Timestamp Firebase ──────────────────────
const formatarData = (createdAt?: { toDate?: () => Date }): string => {
    try {
        const date = createdAt?.toDate ? createdAt.toDate() : new Date();
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch {
        return new Date().toLocaleDateString('pt-BR');
    }
};

// ─── Label legível por forma de pagamento ────────────────────────────────────
const FORMA_LABEL: Record<string, string> = {
    dinheiro: 'Dinheiro',
    pix: 'PIX',
    cartao: 'Cartao',
};

// ─── Builder: Recibo de OS — via loja (controle) ou via cliente ───────────────
export function buildReciboOS(dados: OSPrintData, via: 'controle' | 'cliente'): string {
    const idCurto = dados.id.substring(Math.max(0, dados.id.length - 6)).toUpperCase();
    const valorTotal = dados.sinal + dados.saldo;
    let r = '';

    // Cabeçalho
    r += CMD.CENTER;
    r += CMD.DOUBLE + CMD.BOLD_ON + 'SAPATARIA\nAGUINALDO\n' + CMD.BOLD_OFF + CMD.NORMAL;
    r += 'Reparos e Consertos em Geral\n';
    r += CMD.SEP;

    // Identificação da via
    r += CMD.CENTER + CMD.BOLD_ON;
    r += (via === 'controle' ? '=== VIA LOJA ===\n' : '=== VIA CLIENTE ===\n');
    r += CMD.BOLD_OFF;
    r += CMD.SEP;

    // Dados da OS
    r += CMD.LEFT;
    r += CMD.BOLD_ON + `OS: #${idCurto}\n` + CMD.BOLD_OFF;
    r += `Cliente: ${dados.clienteNome}\n`;
    if (dados.clienteTelefone) r += `Fone: ${dados.clienteTelefone}\n`;
    r += `Data: ${formatarData(dados.createdAt)}\n`;
    r += CMD.SEP;

    // Itens e serviços
    r += CMD.BOLD_ON + 'SERVICOS:\n' + CMD.BOLD_OFF;
    dados.itens.forEach((item, idx) => {
        r += `${idx + 1}. ${item.descricao}\n`;
        item.servicos.forEach((serv) => {
            r += formatLinha(`   ${serv.descricao}`, serv.valor);
        });
    });
    r += CMD.SEP;

    // Totais
    r += CMD.LEFT;
    r += formatLinha('Subtotal:', valorTotal);
    r += formatLinha('Sinal pago:', dados.sinal);
    r += CMD.LF;

    // Saldo em destaque
    r += CMD.CENTER + CMD.DOUBLE + CMD.BOLD_ON;
    r += `SALDO: R$ ${dados.saldo.toFixed(2).replace('.', ',')}\n`;
    r += CMD.BOLD_OFF + CMD.NORMAL;

    // Forma de pagamento do sinal
    r += CMD.LEFT;
    r += `Pgto. sinal: ${FORMA_LABEL[dados.formaPagamentoSinal] || dados.formaPagamentoSinal}\n`;
    r += CMD.SEP;

    // Rodapé diferenciado por via
    r += CMD.CENTER;
    if (via === 'cliente') {
        r += 'Guarde este recibo para\nretirada do seu calcado.\n';
        r += CMD.LF + 'Obrigado pela preferencia!\n';
    } else {
        r += 'Controle Interno — Loja\n';
    }

    // 4 linhas em branco para corte manual ou guilhotina
    r += '\n\n\n\n';
    return r;
}

// ─── Builder: Recibo de Venda Direta ─────────────────────────────────────────
export function buildReciboVendaDireta(dados: VendaDiretaPrintData): string {
    let r = '';

    r += CMD.CENTER;
    r += CMD.DOUBLE + CMD.BOLD_ON + 'SAPATARIA\nAGUINALDO\n' + CMD.BOLD_OFF + CMD.NORMAL;
    r += 'Reparos e Consertos em Geral\n';
    r += CMD.SEP;

    r += CMD.CENTER;
    r += CMD.BOLD_ON + 'VENDA DIRETA\n' + CMD.BOLD_OFF;
    r += `${formatarData(dados.createdAt)}\n`;
    r += CMD.SEP;

    r += CMD.LEFT;
    dados.itens.forEach((item) => {
        r += formatLinha(item.descricao, item.valor);
    });
    r += CMD.SEP;

    r += CMD.CENTER + CMD.DOUBLE + CMD.BOLD_ON;
    r += `TOTAL: R$ ${dados.valor_total.toFixed(2).replace('.', ',')}\n`;
    r += CMD.BOLD_OFF + CMD.NORMAL;
    r += CMD.LEFT;
    r += `Pagamento: ${FORMA_LABEL[dados.formaPagamento] || dados.formaPagamento}\n`;
    r += CMD.SEP;

    r += CMD.CENTER + 'Obrigado pela preferencia!\n';
    r += '\n\n\n\n';
    return r;
}

// ─── Envio interno para a impressora ─────────────────────────────────────────
async function enviarParaImpressora(mac: string, texto: string): Promise<void> {
    const isConnected = await RNBluetoothClassic.isDeviceConnected(mac);
    if (!isConnected) {
        const conn = await RNBluetoothClassic.connectToDevice(mac);
        if (!conn) throw new Error('Nao foi possivel conectar a impressora.');
    }
    await RNBluetoothClassic.writeToDevice(mac, texto);
}

// ─── API Pública: Imprimir OS (2 vias: loja + cliente) ───────────────────────
export async function imprimirReciboOS(mac: string, dados: OSPrintData): Promise<boolean> {
    try {
        // 1ª via: controle da loja
        await enviarParaImpressora(mac, buildReciboOS(dados, 'controle'));
        // Pausa de 1.5s para a impressora terminar e cortar o papel entre as vias
        await new Promise<void>((res) => setTimeout(res, 1500));
        // 2ª via: cliente
        await enviarParaImpressora(mac, buildReciboOS(dados, 'cliente'));
        return true;
    } catch (error) {
        console.error('Erro ao imprimir OS:', error);
        return false;
    }
}

// ─── API Pública: Imprimir Venda Direta (1 via) ───────────────────────────────
export async function imprimirReciboVenda(mac: string, dados: VendaDiretaPrintData): Promise<boolean> {
    try {
        await enviarParaImpressora(mac, buildReciboVendaDireta(dados));
        return true;
    } catch (error) {
        console.error('Erro ao imprimir venda:', error);
        return false;
    }
}

// ─── Builder: Recibo de Fechamento de Caixa ──────────────────────────────────
export function buildReciboFechamento(dados: Omit<FechamentoCaixa, 'id'> & { data?: any }): string {
    let r = '';

    r += CMD.CENTER;
    r += CMD.DOUBLE + CMD.BOLD_ON + 'SAPATARIA\nAGUINALDO\n' + CMD.BOLD_OFF + CMD.NORMAL;
    r += 'Reparos e Consertos em Geral\n';
    r += CMD.SEP;

    r += CMD.CENTER + CMD.BOLD_ON;
    r += 'FECHAMENTO DE CAIXA\n';
    r += CMD.BOLD_OFF;
    r += `Data/Hora: ${formatarData(dados.data)}\n`;
    r += CMD.SEP;

    r += CMD.LEFT;
    r += formatLinha('Total Dinheiro:', dados.totalDinheiro);
    r += formatLinha('Total PIX:', dados.totalPix);
    r += formatLinha('Total Cartao:', dados.totalCartao);
    r += CMD.LF;

    r += CMD.CENTER + CMD.DOUBLE + CMD.BOLD_ON;
    r += `TOTAL GERAL: R$ ${dados.totalGeral.toFixed(2).replace('.', ',')}\n`;
    r += CMD.BOLD_OFF + CMD.NORMAL;
    r += CMD.SEP;

    r += CMD.LEFT;
    r += `OS com pagamento: ${dados.quantidadeOS}\n`;
    r += `Vendas diretas:   ${dados.quantidadeVendas}\n`;
    r += CMD.SEP;

    r += CMD.CENTER + 'Caixa fechado com sucesso.\n';
    r += '\n\n\n\n';
    return r;
}

// ─── Builder: Recibo de Entrega e Quitação de OS ──────────────────────────────
export function buildReciboRetiradaOS(dados: OSPrintData, formaPagamentoSaldo: string): string {
    const idCurto = dados.id.substring(Math.max(0, dados.id.length - 6)).toUpperCase();
    let r = '';

    r += CMD.CENTER;
    r += CMD.DOUBLE + CMD.BOLD_ON + 'SAPATARIA\nAGUINALDO\n' + CMD.BOLD_OFF + CMD.NORMAL;
    r += 'Reparos e Consertos em Geral\n';
    r += CMD.SEP;

    r += CMD.CENTER + CMD.BOLD_ON;
    r += 'QUITACAO DE OS\n';
    r += '=== VIA CLIENTE ===\n';
    r += CMD.BOLD_OFF;
    r += CMD.SEP;

    r += CMD.LEFT;
    r += CMD.BOLD_ON + `OS: #${idCurto}\n` + CMD.BOLD_OFF;
    r += `Cliente: ${dados.clienteNome}\n`;
    r += `Retirada: ${formatarData(undefined)}\n`;
    r += CMD.SEP;

    r += CMD.BOLD_ON + 'SERVICOS ENTREGUES:\n' + CMD.BOLD_OFF;
    dados.itens.forEach((item, idx) => {
        r += `${idx + 1}. ${item.descricao}\n`;
        item.servicos.forEach((serv) => {
            r += formatLinha(`   ${serv.descricao}`, serv.valor);
        });
    });
    r += CMD.SEP;

    r += CMD.LEFT;
    const total = dados.sinal + dados.saldo;
    r += formatLinha('Valor Total:', total);
    r += formatLinha('Sinal Pago:', dados.sinal);
    r += CMD.LF;

    r += CMD.CENTER + CMD.DOUBLE + CMD.BOLD_ON;
    r += `PAGO RETIRADA: R$ ${dados.saldo.toFixed(2).replace('.', ',')}\n`;
    r += CMD.BOLD_OFF + CMD.NORMAL;

    r += CMD.LEFT;
    r += `Pgto. retirada: ${FORMA_LABEL[formaPagamentoSaldo] || formaPagamentoSaldo}\n`;
    r += CMD.SEP;

    r += CMD.CENTER + 'Calcado entregue.\nObrigado pela preferencia!\n';
    r += '\n\n\n\n';
    return r;
}

// ─── API Pública: Imprimir Fechamento de Caixa ────────────────────────────────
export async function imprimirReciboFechamento(mac: string, dados: Omit<FechamentoCaixa, 'id'> & { data?: any }): Promise<boolean> {
    try {
        await enviarParaImpressora(mac, buildReciboFechamento(dados));
        return true;
    } catch (error) {
        console.error('Erro ao imprimir fechamento:', error);
        return false;
    }
}

// ─── API Pública: Imprimir Entrega e Quitação de OS ───────────────────────────
export async function imprimirReciboRetiradaOS(mac: string, dados: OSPrintData, formaPagamentoSaldo: string): Promise<boolean> {
    try {
        await enviarParaImpressora(mac, buildReciboRetiradaOS(dados, formaPagamentoSaldo));
        return true;
    } catch (error) {
        console.error('Erro ao imprimir quitacao de OS:', error);
        return false;
    }
}
