// Spajanje na MySQL bazu podataka (mysql2 - promise verzija)
const mysql = require('mysql2/promise');
const config = require('./config');

// Pool veza - automatski upravlja otvaranjem i zatvaranjem veza prema bazi
const pool = mysql.createPool({
    host: config.baza.host,
    port: config.baza.port,
    user: config.baza.user,
    password: config.baza.password,
    database: config.baza.database,
    charset: config.baza.charset,
    waitForConnections: true,
    connectionLimit: 10
});

module.exports = pool;
