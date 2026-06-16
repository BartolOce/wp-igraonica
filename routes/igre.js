// API rute za rad s drustvenim igrama (pregled za sve, uredivanje samo za admina)
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const baza = require('../db');
const { samoAdmin } = require('../middleware/autorizacija');

const router = express.Router();

// Zajednicki SELECT: uz svaku igru racuna broj dostupnih primjeraka,
// prosjecnu ocjenu i broj recenzija
const OSNOVNI_UPIT = `
    SELECT i.*,
        i.broj_primjeraka - (
            SELECT COUNT(*) FROM posudbe p
            WHERE p.igra_id = i.id AND p.status IN ('rezervirano', 'preuzeto')
        ) AS dostupno,
        (SELECT ROUND(AVG(r.ocjena), 1) FROM recenzije r WHERE r.igra_id = i.id) AS prosjecna_ocjena,
        (SELECT COUNT(*) FROM recenzije r WHERE r.igra_id = i.id) AS broj_recenzija
    FROM igre i
`;

const DOPUSTENE_TEZINE = ['lagana', 'srednja', 'teška'];

// Validacija podataka o igri (za dodavanje i uredivanje)
function provjeriIgru(podaci) {
    const greske = {};
    const trenutnaGodina = new Date().getFullYear();

    if (!podaci.naziv || podaci.naziv.trim().length < 1) {
        greske.naziv = 'Naziv je obvezan.';
    }
    if (!podaci.izdavac || podaci.izdavac.trim().length < 2) {
        greske.izdavac = 'Naziv izdavača mora imati najmanje 2 znaka.';
    }
    if (!podaci.kategorija || podaci.kategorija.trim().length < 2) {
        greske.kategorija = 'Kategorija je obvezna.';
    }
    const godina = Number(podaci.godina);
    if (!Number.isInteger(godina) || godina < 0 || godina > trenutnaGodina) {
        greske.godina = `Godina mora biti broj između 0 i ${trenutnaGodina}.`;
    }
    const minIgraca = Number(podaci.min_igraca);
    const maxIgraca = Number(podaci.max_igraca);
    if (!Number.isInteger(minIgraca) || minIgraca < 1 || minIgraca > 20) {
        greske.min_igraca = 'Najmanji broj igrača mora biti između 1 i 20.';
    }
    if (!Number.isInteger(maxIgraca) || maxIgraca < 1 || maxIgraca > 20) {
        greske.max_igraca = 'Najveći broj igrača mora biti između 1 i 20.';
    }
    if (!greske.min_igraca && !greske.max_igraca && maxIgraca < minIgraca) {
        greske.max_igraca = 'Najveći broj igrača ne smije biti manji od najmanjeg.';
    }
    const trajanje = Number(podaci.trajanje);
    if (!Number.isInteger(trajanje) || trajanje < 1 || trajanje > 1000) {
        greske.trajanje = 'Trajanje (u minutama) mora biti između 1 i 1000.';
    }
    if (!DOPUSTENE_TEZINE.includes(podaci.tezina)) {
        greske.tezina = 'Težina mora biti: lagana, srednja ili teška.';
    }
    const primjerci = Number(podaci.broj_primjeraka);
    if (!Number.isInteger(primjerci) || primjerci < 1 || primjerci > 100) {
        greske.broj_primjeraka = 'Broj primjeraka mora biti između 1 i 100.';
    }
    // slika_url je neobvezna; ako je upisana mora biti vanjski http(s) URL
    // ILI lokalna putanja unutar projekta (npr. /slike/5/box.jpg)
    const slika = (podaci.slika_url || '').trim();
    if (slika !== '' && !/^https?:\/\/.+/i.test(slika) && !/^\/[^\s]+$/.test(slika)) {
        greske.slika_url = 'Unesite http(s):// poveznicu ili lokalnu putanju (npr. /slike/5/box.jpg).';
    }
    return greske;
}

// Pretvara prazan unos URL-a slike u null (za upis u bazu)
function urlSlikeIliNull(vrijednost) {
    const slika = (vrijednost || '').trim();
    return slika === '' ? null : slika;
}

// Stvara placeholder mapu za slike igre (public/slike/<id>/). Ne smije srušiti
// zahtjev ako ne uspije - mapa je samo pomoć pri organizaciji slika.
async function stvoriMapuSlika(igraId) {
    try {
        const mapa = path.join(__dirname, '..', 'public', 'slike', String(igraId));
        await fs.mkdir(mapa, { recursive: true });
        await fs.writeFile(path.join(mapa, '.gitkeep'), '');
    } catch (greska) {
        console.error('Nije moguće stvoriti mapu za slike igre', igraId, '-', greska.message);
    }
}

// GET /api/igre/kategorije - popis svih kategorija (za filter u katalogu)
router.get('/kategorije', async (req, res, next) => {
    try {
        const [redovi] = await baza.query('SELECT DISTINCT kategorija FROM igre ORDER BY kategorija');
        res.json(redovi.map((red) => red.kategorija));
    } catch (greska) {
        next(greska);
    }
});

// GET /api/igre - popis svih igara (uz mogucnost pretrage: ?pretraga=tekst)
router.get('/', async (req, res, next) => {
    try {
        const { pretraga } = req.query;
        let sql = OSNOVNI_UPIT;
        const parametri = [];

        if (pretraga && pretraga.trim() !== '') {
            sql += ' WHERE i.naziv LIKE ? OR i.izdavac LIKE ?';
            const uzorak = `%${pretraga.trim()}%`;
            parametri.push(uzorak, uzorak);
        }
        sql += ' ORDER BY i.naziv';

        const [igre] = await baza.query(sql, parametri);
        res.json(igre);
    } catch (greska) {
        next(greska);
    }
});

// GET /api/igre/:id - detalji jedne igre
router.get('/:id', async (req, res, next) => {
    try {
        const [igre] = await baza.query(OSNOVNI_UPIT + ' WHERE i.id = ?', [req.params.id]);
        if (igre.length === 0) {
            return res.status(404).json({ greska: 'Igra nije pronađena.' });
        }
        res.json(igre[0]);
    } catch (greska) {
        next(greska);
    }
});

// POST /api/igre - dodavanje nove igre (samo admin)
router.post('/', samoAdmin, async (req, res, next) => {
    try {
        const greske = provjeriIgru(req.body);
        if (Object.keys(greske).length > 0) {
            return res.status(400).json({ greska: 'Podaci nisu ispravni.', polja: greske });
        }

        const { naziv, izdavac, kategorija, godina, min_igraca, max_igraca, trajanje, tezina, opis, broj_primjeraka, slika_url } = req.body;
        const [rezultat] = await baza.query(
            `INSERT INTO igre (naziv, izdavac, kategorija, godina, min_igraca, max_igraca, trajanje, tezina, opis, broj_primjeraka, slika_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [naziv.trim(), izdavac.trim(), kategorija.trim(), godina, min_igraca, max_igraca, trajanje, tezina, (opis || '').trim(), broj_primjeraka, urlSlikeIliNull(slika_url)]
        );
        await stvoriMapuSlika(rezultat.insertId); // placeholder mapa za slike nove igre
        res.status(201).json({ poruka: 'Igra je dodana u katalog.', id: rezultat.insertId });
    } catch (greska) {
        next(greska);
    }
});

// PUT /api/igre/:id - uredivanje igre (samo admin)
router.put('/:id', samoAdmin, async (req, res, next) => {
    try {
        const greske = provjeriIgru(req.body);
        if (Object.keys(greske).length > 0) {
            return res.status(400).json({ greska: 'Podaci nisu ispravni.', polja: greske });
        }

        const { naziv, izdavac, kategorija, godina, min_igraca, max_igraca, trajanje, tezina, opis, broj_primjeraka, slika_url } = req.body;

        // broj primjeraka ne smije pasti ispod broja trenutno zauzetih (rezervirano + preuzeto)
        const [zauzeti] = await baza.query(
            `SELECT COUNT(*) AS broj FROM posudbe WHERE igra_id = ? AND status IN ('rezervirano', 'preuzeto')`,
            [req.params.id]
        );
        if (Number(broj_primjeraka) < zauzeti[0].broj) {
            return res.status(409).json({
                greska: `Ne možete smanjiti broj primjeraka ispod ${zauzeti[0].broj} jer je toliko trenutno rezervirano ili posuđeno.`,
                polja: { broj_primjeraka: `Najmanje ${zauzeti[0].broj} (trenutno zauzeto).` }
            });
        }

        const [rezultat] = await baza.query(
            `UPDATE igre SET naziv = ?, izdavac = ?, kategorija = ?, godina = ?, min_igraca = ?,
                    max_igraca = ?, trajanje = ?, tezina = ?, opis = ?, broj_primjeraka = ?, slika_url = ? WHERE id = ?`,
            [naziv.trim(), izdavac.trim(), kategorija.trim(), godina, min_igraca, max_igraca, trajanje, tezina, (opis || '').trim(), broj_primjeraka, urlSlikeIliNull(slika_url), req.params.id]
        );
        if (rezultat.affectedRows === 0) {
            return res.status(404).json({ greska: 'Igra nije pronađena.' });
        }
        res.json({ poruka: 'Igra je uspješno uređena.' });
    } catch (greska) {
        next(greska);
    }
});

// DELETE /api/igre/:id - brisanje igre (samo admin)
router.delete('/:id', samoAdmin, async (req, res, next) => {
    try {
        const [rezultat] = await baza.query('DELETE FROM igre WHERE id = ?', [req.params.id]);
        if (rezultat.affectedRows === 0) {
            return res.status(404).json({ greska: 'Igra nije pronađena.' });
        }
        res.json({ poruka: 'Igra je obrisana iz kataloga.' });
    } catch (greska) {
        next(greska);
    }
});

module.exports = router;
