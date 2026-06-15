// API rute za recenzije igara
const express = require('express');
const baza = require('../db');
const { samoPrijavljeni } = require('../middleware/autorizacija');

const router = express.Router();

// GET /api/recenzije/igra/:id - sve recenzije jedne igre
router.get('/igra/:id', async (req, res, next) => {
    try {
        const [recenzije] = await baza.query(
            `SELECT r.id, r.ocjena, r.komentar, r.datum, r.korisnik_id,
                    ko.ime, ko.prezime
             FROM recenzije r
             JOIN korisnici ko ON ko.id = r.korisnik_id
             WHERE r.igra_id = ?
             ORDER BY r.datum DESC`,
            [req.params.id]
        );
        res.json(recenzije);
    } catch (greska) {
        next(greska);
    }
});

// POST /api/recenzije - dodavanje recenzije { igra_id, ocjena, komentar }
router.post('/', samoPrijavljeni, async (req, res, next) => {
    try {
        const igraId = Number(req.body.igra_id);
        const ocjena = Number(req.body.ocjena);
        const komentar = (req.body.komentar || '').trim();

        // Validacija na strani posluzitelja
        const greske = {};
        if (!Number.isInteger(igraId) || igraId < 1) {
            greske.igra_id = 'Neispravan ID igre.';
        }
        if (!Number.isInteger(ocjena) || ocjena < 1 || ocjena > 5) {
            greske.ocjena = 'Ocjena mora biti između 1 i 5.';
        }
        if (komentar.length < 10) {
            greske.komentar = 'Komentar mora imati najmanje 10 znakova.';
        }
        if (Object.keys(greske).length > 0) {
            return res.status(400).json({ greska: 'Podaci nisu ispravni.', polja: greske });
        }

        const [igre] = await baza.query('SELECT id FROM igre WHERE id = ?', [igraId]);
        if (igre.length === 0) {
            return res.status(404).json({ greska: 'Igra nije pronađena.' });
        }

        // Recenziju smije napisati samo onaj tko je igru stvarno preuzeo ili vratio
        const [posudio] = await baza.query(
            `SELECT id FROM posudbe
             WHERE korisnik_id = ? AND igra_id = ? AND status IN ('preuzeto', 'vraceno')
             LIMIT 1`,
            [req.session.korisnik.id, igraId]
        );
        if (posudio.length === 0) {
            return res.status(403).json({ greska: 'Recenziju možete napisati tek nakon što ste igru posudili.' });
        }

        const [rezultat] = await baza.query(
            'INSERT INTO recenzije (korisnik_id, igra_id, ocjena, komentar) VALUES (?, ?, ?, ?)',
            [req.session.korisnik.id, igraId, ocjena, komentar]
        );
        res.status(201).json({ poruka: 'Recenzija je objavljena. Hvala na mišljenju!', id: rezultat.insertId });
    } catch (greska) {
        // UNIQUE ogranicenje u bazi: jedan korisnik = jedna recenzija po igri
        if (greska.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ greska: 'Već ste napisali recenziju za ovu igru.' });
        }
        next(greska);
    }
});

// DELETE /api/recenzije/:id - brisanje vlastite recenzije (admin moze brisati sve)
router.delete('/:id', samoPrijavljeni, async (req, res, next) => {
    try {
        const korisnik = req.session.korisnik;
        let sql = 'DELETE FROM recenzije WHERE id = ?';
        const parametri = [req.params.id];

        if (korisnik.uloga !== 'admin') {
            sql += ' AND korisnik_id = ?';
            parametri.push(korisnik.id);
        }

        const [rezultat] = await baza.query(sql, parametri);
        if (rezultat.affectedRows === 0) {
            return res.status(404).json({ greska: 'Recenzija nije pronađena ili nemate pravo obrisati je.' });
        }
        res.json({ poruka: 'Recenzija je obrisana.' });
    } catch (greska) {
        next(greska);
    }
});

module.exports = router;
