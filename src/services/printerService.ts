// src/services/printerService.ts
import RNBluetoothClassic from 'react-native-bluetooth-classic';
// Tabela de comandos padrão ESC/POS
const COMMANDS = {
  ESC: '\x1b',
  GS: '\x1d',
  CENTER: '\x1b' + 'a' + '1', // Alinha ao centro
  LEFT: '\x1b' + 'a' + '0',   // Alinha à esquerda
  RIGHT: '\x1b' + 'a' + '2',  // Alinha à direita
  BOLD_ON: '\x1b' + 'E' + '1', // Ativa negrito
  BOLD_OFF: '\x1b' + 'E' + '0', // Desativa negrito
  NORMAL_TEXT: '\x1d' + '!' + '\x00', // Tamanho normal
  DOUBLE_TEXT: '\x1d' + '!' + '\x11', // Tamanho duplo (largura e altura)
  LINE_BREAK: '\n',
  SEPARATOR: '--------------------------------\n', // 32 caracteres (padrão 58mm)
};

// Interface para tipar os dados que virão da "Nova OS"
interface PrintItem {
  descricao: string;
  quantidade: number;
  preco: number;
}

interface OrdemServicoData {
  numeroOS: string;
  clienteNome: string;
  dataEntrada: string;
  itens: PrintItem[];
  valorTotal: number;
  sinalPago: number;
}

/**
 * Função utilitária para alinhar texto à esquerda e preço à direita
 * Ex: "Sola Sapato            R$ 45,00"
 */
const formatItemLine = (name: string, price: number, maxWidth = 32): string => {
  const priceStr = `R$ ${price.toFixed(2).replace('.', ',')}`;
  // Se o nome do serviço for muito grande, corta para não quebrar a linha de forma feia
  const maxNameLength = maxWidth - priceStr.length - 1;
  let formattedName = name.length > maxNameLength ? name.substring(0, maxNameLength) : name;
  
  // Preenche os espaços vazios entre o nome e o preço
  const spaces = maxWidth - formattedName.length - priceStr.length;
  return formattedName + ' '.repeat(Math.max(0, spaces)) + priceStr + '\n';
};

/**
 * Constrói a string completa em formato ESC/POS para enviar ao Bluetooth
 */
export const buildReceiptString = (os: OrdemServicoData): string => {
  let receipt = '';

  // CABEÇALHO
  receipt += COMMANDS.CENTER;
  receipt += COMMANDS.DOUBLE_TEXT + COMMANDS.BOLD_ON + 'SAPATARIA\nAGUINALDO\n' + COMMANDS.BOLD_OFF + COMMANDS.NORMAL_TEXT;
  receipt += COMMANDS.LINE_BREAK;
  receipt += 'Reparos e Consertos em Geral\n';
  receipt += COMMANDS.SEPARATOR;

  // DADOS DA OS
  receipt += COMMANDS.LEFT;
  receipt += COMMANDS.BOLD_ON + `Ordem de Servico: #${os.numeroOS}\n` + COMMANDS.BOLD_OFF;
  receipt += `Cliente: ${os.clienteNome}\n`;
  receipt += `Data: ${os.dataEntrada}\n`;
  receipt += COMMANDS.SEPARATOR;

  // ITENS DO SERVIÇO
  receipt += COMMANDS.BOLD_ON + 'ITENS DA O.S.\n' + COMMANDS.BOLD_OFF;
  os.itens.forEach((item) => {
    receipt += formatItemLine(`${item.quantidade}x ${item.descricao}`, item.preco);
  });
  receipt += COMMANDS.SEPARATOR;

  // TOTAIS
  receipt += COMMANDS.LEFT;
  receipt += formatItemLine('Subtotal:', os.valorTotal);
  receipt += formatItemLine('Sinal Pago:', os.sinalPago);
  
  receipt += COMMANDS.LINE_BREAK;
  receipt += COMMANDS.CENTER + COMMANDS.DOUBLE_TEXT + COMMANDS.BOLD_ON;
  receipt += `SALDO: R$ ${(os.valorTotal - os.sinalPago).toFixed(2).replace('.', ',')}\n`;
  receipt += COMMANDS.BOLD_OFF + COMMANDS.NORMAL_TEXT;
  
  // RODAPÉ
  receipt += COMMANDS.LINE_BREAK;
  receipt += COMMANDS.CENTER;
  receipt += 'Obrigado pela preferencia!\n';
  receipt += 'Guarde este recibo para\nretirada do seu calcado.\n';
  
  // Pula algumas linhas no final para a guilhotina/corte manual da impressora
  receipt += '\n\n\n\n';

  return receipt;
};

export const imprimirRecibo = async (macAddress: string, osData: OrdemServicoData): Promise<boolean> => {
  try {
    // 1. Verifica se já está conectado a este dispositivo
    const isConnected = await RNBluetoothClassic.isDeviceConnected(macAddress);
    
    // 2. Se não estiver, tenta conectar
    if (!isConnected) {
      const connection = await RNBluetoothClassic.connectToDevice(macAddress);
      if (!connection) {
        throw new Error('Não foi possível estabelecer conexão com a impressora.');
      }
    }

    // 3. Gera a string formatada usando a função que criamos anteriormente
    const receiptString = buildReceiptString(osData);

    // 4. Envia os dados para a impressora
    // O writeToDevice converte a string para bytes automaticamente
    await RNBluetoothClassic.writeToDevice(macAddress, receiptString);

    return true; // Sucesso!
  } catch (error) {
    console.error('Erro durante a impressão:', error);
    return false; // Falha
  }
};

