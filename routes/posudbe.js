// =====================================================
// posudbe.js - API rute za posudbe igara
// Tijek: korisnik rezervira -> admin potvrdi preuzimanje -> admin potvrdi povrat.
// Korisnik smije otkazati vlastitu rezervaciju dok je jos nije preuzeo.
// =====================================================
const express = require('express');
const baza = require('../db');
const { samoPrijavljeni, samoAdmin } = require('../middleware/autorizacija');

const router = express.Router();

const ROK_POSUDBE_DANA = 14;       // koliko dana korisnik smije drzati igru (od preuzimanja)
const MAKS_AKTIVNIH_POSUDBI = 3;   // rezervirano + preuzeto zajedno

// "Aktivna" posudba zauzima primjerak: rezervirana ili trenutno preuzeta
const AKTIVNI_STATUSI = "('rezervirano', 'preuzeto')";

// GET /api/posudbe/moje - sve posudbe prijavljenog korisnika
router.get('/moje', samoPrijavljeni, async (req, res, next) => {
    try {
        const [posudbe] = await baza.query(
            `SELECT p.id, p.status, p.datum_rezervacije, p.datum_preuzimanja, p.rok_vracanja, p.datum_vracanja,
                    i.id AS igra_id, i.naziv, i.izdavac, i.kategorija
             FROM posudbe p
             JOIN igre i ON i.id = p.igra_id
             WHERE p.korisnik_id = ?
             ORDER BY FIELD(p.status, 'preuzeto', 'rezervirano', 'vraceno', 'otkazano'), p.datum_rezervacije DESC`,
            [req.session.korisnik.id]
        );
        res.json(posudbe);
    } catch (greska) {
        next(greska);
    }
});

// GET /api/posudbe - sve posudbe (samo admin), za upravljanje i nadzornu plocu
// Neobvezni filtar ?status=rezervirano|preuzeto|vraceno|otkazano
router.get('/', samoAdmin, async (req, res, next) => {
    try {
        const { status } = req.query;
        const dopusteni = ['rezervirano', 'preuzeto', 'vraceno', 'otkazano'];
        let sql = `
            SELECT p.id, p.status, p.datum_rezervacije, p.datum_preuzimanja, p.rok_vracanja, p.datum_vracanja,
                   i.id AS igra_id, i.naziv, i.izdavac,
                   k.id AS korisnik_id, k.ime, k.prezime, k.email
            FROM posudbe p
            JOIN igre i ON i.id = p.igra_id
            JOIN korisnici k ON k.id = p.korisnik_id`;
        const parametri = [];
        if (status && dopusteni.includes(status)) {
            sql += ' WHERE p.status = ?';
            parametri.push(status);
        }
        sql += " ORDER BY FIELD(p.status, 'rezervirano', 'preuzeto', 'vraceno', 'otkazano'), p.datum_rezervacije DESC";
        const [posudbe] = await baza.query(sql, parametri);
        res.json(posudbe);
    } catch (greska) {
        next(greska);
    }
});

// POST /api/posudbe - rezervacija igre { igra_id }
router.post('/', samoPrijavljeni, async (req, res, next) => {
    try {
        const igraId = Number(req.body.igra_id);
        const korisnikId = req.session.korisnik.id;

        if (!Number.isInteger(igraId) || igraId < 1) {
            return res.status(400).json({ greska: 'Neispravan ID igre.' });
        }

        const [igre] = await baza.query('SELECT * FROM igre WHERE id = ?', [igraId]);
        if (igre.length === 0) {
            return res.status(404).json({ greska: 'Igra nije pronađena.' });
        }
        const igra = igre[0];

        // Korisnik koji kasni s vracanjem ne moze rezervirati nove igre
        const [zakasnjele] = await baza.query(
            `SELECT COUNT(*) AS broj FROM posudbe
             WHERE korisnik_id = ? AND status = 'preuzeto' AND rok_vracanja < CURDATE()`,
            [korisnikId]
        );
        if (zakasnjele[0].broj > 0) {
            return res.status(409).json({ greska: 'Imate igru kojoj je istekao rok vraćanja. Vratite je prije nove rezervacije.' });
        }

        // Ima li korisnik vec aktivnu posudbu (rezervaciju ili preuzetu) za ovu igru?
        const [vecAktivna] = await baza.query(
            `SELECT id FROM posudbe WHERE korisnik_id = ? AND igra_id = ? AND status IN ${AKTIVNI_STATUSI}`,
            [korisnikId, igraId]
        );
        if (vecAktivna.length > 0) {
            return res.status(409).json({ greska: 'Ovu igru ste već rezervirali ili posudili.' });
        }

        // Maksimalan broj aktivnih posudbi po korisniku
        const [aktivne] = await baza.query(
            `SELECT COUNT(*) AS broj FROM posudbe WHERE korisnik_id = ? AND status IN ${AKTIVNI_STATUSI}`,
            [korisnikId]
        );
        if (aktivne[0].broj >= MAKS_AKTIVNIH_POSUDBI) {
            return res.status(409).json({
                greska: `Možete imati najviše ${MAKS_AKTIVNIH_POSUDBI} aktivne rezervacije/posudbe istovremeno.`
            });
        }

        // Ima li slobodnih primjeraka (oduzmi rezervirane i preuzete)?
        const [zauzeti] = await baza.query(
            `SELECT COUNT(*) AS broj FROM posudbe WHERE igra_id = ? AND status IN ${AKTIVNI_STATUSI}`,
            [igraId]
        );
        if (zauzeti[0].broj >= igra.broj_primjeraka) {
            return res.status(409).json({ greska: 'Trenutno nema slobodnih primjeraka ove igre.' });
        }

        const [rezultat] = await baza.query(
            `INSERT INTO posudbe (korisnik_id, igra_id, status) VALUES (?, ?, 'rezervirano')`,
            [korisnikId, igraId]
        );
        res.status(201).json({
            poruka: `Igra "${igra.naziv}" je rezervirana! Preuzmite je na šalteru igraonice, a djelatnik će potvrditi preuzimanje.`,
            id: rezultat.insertId
        });
    } catch (greska) {
        next(greska);
    }
});

// PUT /api/posudbe/:id/otkazi - korisnik otkazuje vlastitu (jos nepreuzetu) rezervaciju
router.put('/:id/otkazi', samoPrijavljeni, async (req, res, next) => {
    try {
        const [rezultat] = await baza.query(
            `UPDATE posudbe SET status = 'otkazano'
             WHERE id = ? AND korisnik_id = ? AND status = 'rezervirano'`,
            [req.params.id, req.session.korisnik.id]
        );
        if (rezultat.affectedRows === 0) {
            return res.status(404).json({ greska: 'Rezervacija nije pronađena ili se više ne može otkazati.' });
        }
        res.json({ poruka: 'Rezervacija je otkazana.' });
    } catch (greska) {
        next(greska);
    }
});

// PUT /api/posudbe/:id/preuzmi - ADMIN potvrdjuje da je korisnik preuzeo igru
// (postavlja rok vracanja na danas + ROK_POSUDBE_DANA)
router.put('/:id/preuzmi', samoAdmin, async (req, res, next) => {
    try {
        const [rezultat] = await baza.query(
            `UPDATE posudbe
             SET status = 'preuzeto',
                 datum_preuzimanja = NOW(),
                 rok_vracanja = DATE_ADD(CURDATE(), INTERVAL ? DAY)
             WHERE id = ? AND status = 'rezervirano'`,
            [ROK_POSUDBE_DANA, req.params.id]
        );
        if (rezultat.affectedRows === 0) {
            return res.status(404).json({ greska: 'Rezervacija nije pronađena ili je već obrađena.' });
        }
        res.json({ poruka: `Preuzimanje potvrđeno. Rok za vraćanje je ${ROK_POSUDBE_DANA} dana.` });
    } catch (greska) {
        next(greska);
    }
});

// PUT /api/posudbe/:id/vrati - ADMIN potvrdjuje povrat preuzete igre
router.put('/:id/vrati', samoAdmin, async (req, res, next) => {
    try {
        const [rezultat] = await baza.query(
            `UPDATE posudbe SET status = 'vraceno', datum_vracanja = NOW()
             WHERE id = ? AND status = 'preuzeto'`,
            [req.params.id]
        );
        if (rezultat.affectedRows === 0) {
            return res.status(404).json({ greska: 'Posudba nije pronađena ili igra nije bila preuzeta.' });
        }
        res.json({ poruka: 'Povrat igre je potvrđen. Hvala!' });
    } catch (greska) {
        next(greska);
    }
});

// PUT /api/posudbe/:id/admin-otkazi - ADMIN otkazuje (brise) tudju rezervaciju.
// Otkazati se moze samo rezervacija koja jos nije preuzeta.
router.put('/:id/admin-otkazi', samoAdmin, async (req, res, next) => {
    try {
        const [rezultat] = await baza.query(
            `UPDATE posudbe SET status = 'otkazano'
             WHERE id = ? AND status = 'rezervirano'`,
            [req.params.id]
        );
        if (rezultat.affectedRows === 0) {
            return res.status(404).json({ greska: 'Rezervacija nije pronađena ili je već obrađena.' });
        }
        res.json({ poruka: 'Rezervacija je otkazana.' });
    } catch (greska) {
        next(greska);
    }
});

module.exports = router;
