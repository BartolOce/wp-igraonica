// API rute za omiljene igre (wishlist) - samo za prijavljene korisnike
const express = require('express');
const baza = require('../db');
const { samoPrijavljeni } = require('../middleware/autorizacija');

const router = express.Router();

// GET /api/omiljene/ids - popis ID-eva omiljenih igara prijavljenog korisnika
// (koristi se za brzi prikaz stanja "srca" na karticama u katalogu)
router.get('/ids', samoPrijavljeni, async (req, res, next) => {
    try {
        const [redovi] = await baza.query(
            'SELECT igra_id FROM omiljene WHERE korisnik_id = ?',
            [req.session.korisnik.id]
        );
        res.json(redovi.map((r) => r.igra_id));
    } catch (greska) {
        next(greska);
    }
});

// GET /api/omiljene/moje - omiljene igre s punim podacima (za prikaz na profilu)
router.get('/moje', samoPrijavljeni, async (req, res, next) => {
    try {
        const [igre] = await baza.query(
            `SELECT i.*,
                i.broj_primjeraka - (
                    SELECT COUNT(*) FROM posudbe p
                    WHERE p.igra_id = i.id AND p.status IN ('rezervirano', 'preuzeto')
                ) AS dostupno,
                (SELECT ROUND(AVG(r.ocjena), 1) FROM recenzije r WHERE r.igra_id = i.id) AS prosjecna_ocjena,
                (SELECT COUNT(*) FROM recenzije r WHERE r.igra_id = i.id) AS broj_recenzija
             FROM omiljene o
             JOIN igre i ON i.id = o.igra_id
             WHERE o.korisnik_id = ?
             ORDER BY o.datum DESC`,
            [req.session.korisnik.id]
        );
        res.json(igre);
    } catch (greska) {
        next(greska);
    }
});

// POST /api/omiljene - dodaj igru u omiljene { igra_id }
router.post('/', samoPrijavljeni, async (req, res, next) => {
    try {
        const igraId = Number(req.body.igra_id);
        if (!Number.isInteger(igraId) || igraId < 1) {
            return res.status(400).json({ greska: 'Neispravan ID igre.' });
        }
        const [igre] = await baza.query('SELECT id FROM igre WHERE id = ?', [igraId]);
        if (igre.length === 0) {
            return res.status(404).json({ greska: 'Igra nije pronađena.' });
        }
        // INSERT IGNORE: ponovni klik ne stvara gresku ako je vec omiljena
        await baza.query(
            'INSERT IGNORE INTO omiljene (korisnik_id, igra_id) VALUES (?, ?)',
            [req.session.korisnik.id, igraId]
        );
        res.status(201).json({ poruka: 'Dodano u omiljene.' });
    } catch (greska) {
        next(greska);
    }
});

// DELETE /api/omiljene/:igraId - makni igru iz omiljenih
router.delete('/:igraId', samoPrijavljeni, async (req, res, next) => {
    try {
        await baza.query(
            'DELETE FROM omiljene WHERE korisnik_id = ? AND igra_id = ?',
            [req.session.korisnik.id, req.params.igraId]
        );
        res.json({ poruka: 'Uklonjeno iz omiljenih.' });
    } catch (greska) {
        next(greska);
    }
});

module.exports = router;
