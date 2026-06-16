// =====================================================
// config.js - sredisnja konfiguracija aplikacije
// Port posluzitelja, postavke MySQL baze (XAMPP) i sesije.
// =====================================================
module.exports = {
    port: 3000,
    baza: {
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        database: 'igraonica',
        charset: 'utf8mb4'
    },
    sesija: {
        tajna: 'igraonica-tajni-kljuc-2026',
        trajanje: 1000 * 60 * 60 * 24 // 24 sata
    }
};
