export const reloadSignal = {
    // By default, all screens are marked dirty so they perform their initial load on first entry.
    dashboard: true,
    ordens: true,
    vendas: true,
    caixa: true,
    clientes: true,

    // Call this helper function when any data is saved, updated, or deleted
    markAllDirty() {
        this.dashboard = true;
        this.ordens = true;
        this.vendas = true;
        this.caixa = true;
        this.clientes = true;
    }
};
