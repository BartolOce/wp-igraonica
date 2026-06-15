// Igraonica - glavni posluzitelj (Node.js + Express)
// Pokretanje: npm start  (prije prvog pokretanja: npm run init-baza)
const express = require('express');
const session = require('express-session');
const path = require('path');
const config = require('./config');
const baza = require('./db');

const app = express();

// --- Middleware ---
app.use(express.json());                              // citanje JSON tijela zahtjeva
app.use(express.urlencoded({ extended: true }));
app.use(session({                                     // sesije za prijavu korisnika
    secret: config.sesija.tajna,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: config.sesija.trajanje }
}));
app.use(express.static(path.join(__dirname, 'public'))); // posluzivanje front-end datoteka

// --- API rute (sva komunikacija je u JSON obliku) ---
const { samoAdmin } = require('./middleware/autorizacija');
app.use('/api/auth', require('./routes/auth'));
app.use('/api/igre', require('./routes/igre'));
app.use('/api/posudbe', require('./routes/posudbe'));
app.use('/api/recenzije', require('./routes/recenzije'));
app.use('/api/omiljene', require('./routes/omiljene'));

// GET /api/admin/statistika - brojke i pregledi za admin nadzornu plocu (samo admin)
app.get('/api/admin/statistika', samoAdmin, async (req, res, next) => {
    try {
        const [[igre]] = await baza.query('SELECT COUNT(*) AS broj, COALESCE(SUM(broj_primjeraka), 0) AS primjerci FROM igre');
        const [[korisnici]] = await baza.query("SELECT COUNT(*) AS broj FROM korisnici WHERE uloga = 'korisnik'");
        const [[recenzije]] = await baza.query('SELECT COUNT(*) AS broj FROM recenzije');
        // brojevi posudbi po statusu
        const [statusi] = await baza.query('SELECT status, COUNT(*) AS broj FROM posudbe GROUP BY status');
        const poStatusu = { rezervirano: 0, preuzeto: 0, vraceno: 0, otkazano: 0 };
        statusi.forEach((s) => { poStatusu[s.status] = s.broj; });
        // top 5 najtrazenijih igara (po broju svih posudbi osim otkazanih)
        const [najtrazenije] = await baza.query(
            `SELECT i.naziv, COUNT(p.id) AS broj
             FROM posudbe p JOIN igre i ON i.id = p.igra_id
             WHERE p.status <> 'otkazano'
             GROUP BY p.igra_id ORDER BY broj DESC, i.naziv LIMIT 5`
        );
        // broj igara po kategoriji
        const [poKategoriji] = await baza.query(
            'SELECT kategorija, COUNT(*) AS broj FROM igre GROUP BY kategorija ORDER BY broj DESC, kategorija'
        );
        res.json({
            brojIgara: igre.broj,
            brojPrimjeraka: Number(igre.primjerci),
            brojClanova: korisnici.broj,
            brojRecenzija: recenzije.broj,
            posudbe: poStatusu,
            najtrazenije,
            poKategoriji
        });
    } catch (greska) {
        next(greska);
    }
});

// Nepostojeca API ruta -> 404 u JSON obliku
app.use('/api', (req, res) => {
    res.status(404).json({ greska: 'Tražena API ruta ne postoji.' });
});

// Centralno rukovanje greskama - klijent uvijek dobiva JSON odgovor
app.use((greska, req, res, next) => {
    console.error('Greška na poslužitelju:', greska.message);
    res.status(500).json({ greska: 'Došlo je do greške na poslužitelju. Pokušajte ponovno.' });
});

// --- Pokretanje posluzitelja ---
app.listen(config.port, async () => {
    console.log('=========================================');
    console.log(`  Igraonica radi na: http://localhost:${config.port}`);
    console.log('=========================================');
    try {
        await baza.query('SELECT 1');
        console.log('Veza s bazom podataka: OK');
    } catch (greska) {
        console.error('UPOZORENJE: Baza podataka nije dostupna!');
        console.error('1) Pokrenite MySQL u XAMPP Control Panelu');
        console.error('2) Ako baza još ne postoji, pokrenite: npm run init-baza');
    }
});
