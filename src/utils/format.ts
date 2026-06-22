/**
 * Utilitários de formatação para Sapataria Aguinaldo
 */

/**
 * Formata um valor numérico para o padrão de moeda brasileiro (R$ 1.234,56)
 */
export function formatarReal(valor: number): string {
    if (valor === undefined || valor === null || isNaN(valor)) {
        return 'R$ 0,00';
    }
    const [inteiro, decimal] = valor.toFixed(2).split('.');
    const formatadoInteiro = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `R$ ${formatadoInteiro},${decimal}`;
}

/**
 * Aplica a máscara de telefone (11) 99999-9999 ou (11) 9999-9999 dinamicamente
 */
export function aplicarMascaraTelefone(value: string): string {
    if (!value) return '';
    // Remove tudo o que não for dígito
    const apenasDigitos = value.replace(/\D/g, '');
    
    // Limita a 11 caracteres (DDD + 9 dígitos)
    const corte = apenasDigitos.slice(0, 11);
    
    if (corte.length <= 2) {
        return corte;
    }
    if (corte.length <= 6) {
        return `(${corte.slice(0, 2)}) ${corte.slice(2)}`;
    }
    if (corte.length <= 10) {
        return `(${corte.slice(0, 2)}) ${corte.slice(2, 6)}-${corte.slice(6)}`;
    }
    return `(${corte.slice(0, 2)}) ${corte.slice(2, 7)}-${corte.slice(7)}`;
}

/**
 * Formata um número de telefone salvo no banco de dados para exibição com máscara
 */
export function formatarTelefone(telefone: string): string {
    if (!telefone) return '';
    const digitos = telefone.replace(/\D/g, '');
    
    // Se começa com DDI Brasil (55) e tem tamanho de celular/fixo nacional, remove para exibição amigável
    let n = digitos;
    if (digitos.startsWith('55') && (digitos.length === 12 || digitos.length === 13)) {
        n = digitos.substring(2);
    }
    
    return aplicarMascaraTelefone(n);
}

/**
 * Limpa a máscara do telefone para salvar apenas dígitos no banco de dados
 */
export function limparMascaraTelefone(telefone: string): string {
    if (!telefone) return '';
    return telefone.replace(/\D/g, '');
}
