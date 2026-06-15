// Konfiguracija aplikacije
// Postavke za spajanje na MySQL bazu (XAMPP - zadane postavke)
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
