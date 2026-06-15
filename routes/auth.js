// API rute za autentifikaciju: registracija, prijava, odjava, trenutni korisnik
const express = require('express');
const bcrypt = require('bcryptjs');
const baza = require('../db');

const router = express.Router();

// Validacija podataka na strani posluzitelja
// (klijentska validacija se moze zaobici pa se podaci uvijek provjeravaju i ovdje)
function provjeriRegistraciju(podaci) {
    const greske = {};
    const { ime, prezime, email, lozinka } = podaci;

    if (!ime || ime.trim().length < 2) {
        greske.ime = 'Ime mora imati najmanje 2 znaka.';
    }
    if (!prezime || prezime.trim().length < 2) {
        greske.prezime = 'Prezime mora imati najmanje 2 znaka.';
    }
    const emailUzorak = /^[\w.+-]+@[\w-]+\.[\w.]{2,}$/;
    if (!email || !emailUzorak.test(email.trim())) {
        greske.email = 'Unesite ispravnu e-mail adresu.';
    }
    if (!lozinka || lozinka.length < 8) {
        greske.lozinka = 'Lozinka mora imati najmanje 8 znakova.';
    } else if (!/[a-zA-Z]/.test(lozinka) || !/\d/.test(lozinka)) {
        greske.lozinka = 'Lozinka mora sadržavati barem jedno slovo i jednu znamenku.';
    }
    return greske;
}

// POST /api/auth/registracija - registracija novog korisnika
router.post('/registracija', async (req, res, next) => {
    try {
        const greske = provjeriRegistraciju(req.body);
        if (Object.keys(greske).length > 0) {
            return res.status(400).json({ greska: 'Podaci nisu ispravni.', polja: greske });
        }

        const { ime, prezime, email, lozinka } = req.body;

        // Provjera postoji li vec korisnik s istim e-mailom
        const [postojeci] = await baza.query(
            'SELECT id FROM korisnici WHERE email = ?',
            [email.trim().toLowerCase()]
        );
        if (postojeci.length > 0) {
            return res.status(409).json({ greska: 'Korisnik s tom e-mail adresom već postoji.' });
        }

        // Lozinka se nikad ne sprema u citljivom obliku, vec kao bcrypt hash
        const hashLozinke = await bcrypt.hash(lozinka, 10);
        const [rezultat] = await baza.query(
            'INSERT INTO korisnici (ime, prezime, email, lozinka) VALUES (?, ?, ?, ?)',
            [ime.trim(), prezime.trim(), email.trim().toLowerCase(), hashLozinke]
        );

        res.status(201).json({ poruka: 'Registracija uspješna! Sada se možete prijaviti.', id: rezultat.insertId });
    } catch (greska) {
        next(greska);
    }
});

// POST /api/auth/prijava - prijava korisnika
router.post('/prijava', async (req, res, next) => {
    try {
        const { email, lozinka } = req.body;
        if (!email || !lozinka) {
            return res.status(400).json({ greska: 'Unesite e-mail i lozinku.' });
        }

        const [korisnici] = await baza.query(
            'SELECT * FROM korisnici WHERE email = ?',
            [email.trim().toLowerCase()]
        );
        // Ista poruka za nepostojeci e-mail i pogresnu lozinku (sigurnosna praksa)
        if (korisnici.length === 0) {
            return res.status(401).json({ greska: 'Pogrešan e-mail ili lozinka.' });
        }

        const korisnik = korisnici[0];
        const lozinkaIspravna = await bcrypt.compare(lozinka, korisnik.lozinka);
        if (!lozinkaIspravna) {
            return res.status(401).json({ greska: 'Pogrešan e-mail ili lozinka.' });
        }

        // Spremanje korisnika u sesiju (bez lozinke!)
        req.session.korisnik = {
            id: korisnik.id,
            ime: korisnik.ime,
            prezime: korisnik.prezime,
            email: korisnik.email,
            uloga: korisnik.uloga
        };
        res.json({ poruka: `Dobro došli, ${korisnik.ime}!`, korisnik: req.session.korisnik });
    } catch (greska) {
        next(greska);
    }
});

// POST /api/auth/odjava - odjava korisnika
router.post('/odjava', (req, res) => {
    req.session.destroy(() => {
        res.json({ poruka: 'Uspješno ste odjavljeni.' });
    });
});

// GET /api/auth/ja - podaci o trenutno prijavljenom korisniku
router.get('/ja', (req, res) => {
    if (req.session.korisnik) {
        res.json({ prijavljen: true, korisnik: req.session.korisnik });
    } else {
        res.json({ prijavljen: false, korisnik: null });
    }
});

module.exports = router;
