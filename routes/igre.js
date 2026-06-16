// =====================================================
// igre.js - API rute za katalog drustvenih igara
// Pregled i pretraga za sve; dodavanje, uredivanje i brisanje samo admin.
// Slike: naslovna (igre.slika_url) + galerija (tablica slike).
// =====================================================
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const baza = require('../db');
const { samoAdmin } = require('../middleware/autorizacija');

const router = express.Router();

// Zajednicki SELECT: uz svaku igru racuna broj dostupnih primjeraka,
// prosjecnu ocjenu i broj recenzija (slika_url je naslovna slika)
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

// Dozvoljeni formati za upload slike i najveca velicina po slici
const TIP_U_NASTAVAK = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
const MAKS_VELICINA_SLIKE = 3 * 1024 * 1024; // 3 MB po slici
const MAPA_SLIKA = path.join(__dirname, '..', 'public', 'slike');

// Naziv igre -> sigurna "slug" putanja mape (Catan -> catan, "7 Wonders" -> 7-wonders,
// "Čovječe, ne ljuti se" -> covjece-ne-ljuti-se). Slug sadrzi samo [a-z0-9-]
// pa je siguran kao ime mape (sprjecava path-traversal).
function nazivUSlug(naziv) {
    const bezKvacica = { 'č': 'c', 'ć': 'c', 'ž': 'z', 'š': 's', 'đ': 'd' };
    return String(naziv || '')
        .toLowerCase()
        .replace(/[čćžšđ]/g, (z) => bezKvacica[z])
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'igra';
}

// Osigurava da mapa igre postoji (public/slike/<slug>/). Vraca slug.
async function osigurajMapu(naziv) {
    const slug = nazivUSlug(naziv);
    await fs.mkdir(path.join(MAPA_SLIKA, slug), { recursive: true });
    return slug;
}

// Slike koje fizicki postoje u mapi igre, sortirane po nazivu datoteke.
// Tako se i slika rucno ubacena u mapu prikaze, bez upisa u bazu.
const SLIKA_NASTAVAK = /\.(jpe?g|png|webp|gif)$/i;
async function slikeIzMape(naziv) {
    try {
        const slug = nazivUSlug(naziv);
        const datoteke = await fs.readdir(path.join(MAPA_SLIKA, slug));
        return datoteke
            .filter((d) => SLIKA_NASTAVAK.test(d))
            .sort()
            .map((d) => `/slike/${slug}/${d}`);
    } catch (greska) {
        return []; // mapa ne postoji ili nije citljiva
    }
}

// Sprema base64 sliku (data URL) u mapu igre; vraca javnu putanju /slike/<slug>/<datoteka>
async function spremiBase64Sliku(dataUrl, naziv) {
    const m = /^data:(image\/[a-z+]+);base64,(.+)$/is.exec(dataUrl);
    if (!m) throw new Error('Neispravan format slike.');
    const nastavak = TIP_U_NASTAVAK[m[1].toLowerCase()];
    if (!nastavak) throw new Error('Nepodržan format slike (dozvoljeno: JPG, PNG, WEBP, GIF).');
    const podaci = Buffer.from(m[2], 'base64');
    if (podaci.length > MAKS_VELICINA_SLIKE) throw new Error('Slika je prevelika (najviše 3 MB po slici).');
    const slug = await osigurajMapu(naziv);
    const imeDatoteke = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${nastavak}`;
    await fs.writeFile(path.join(MAPA_SLIKA, slug, imeDatoteke), podaci);
    return `/slike/${slug}/${imeDatoteke}`;
}

// Pretvara jedan unos slike u spremljenu putanju:
//  - "data:image/...;base64,..." -> upload (sprema datoteku u mapu igre)
//  - "http(s)://..."             -> vanjski URL (koristi se kako jest)
//  - "/slike/..."                -> lokalna putanja unutar projekta
//  - prazno / neispravno         -> null (preskace se)
async function rijesiSliku(unos, naziv) {
    const v = String(unos || '').trim();
    if (v === '') return null;
    if (/^data:image\//i.test(v)) return await spremiBase64Sliku(v, naziv);
    if (/^https?:\/\/.+/i.test(v)) return v;
    if (/^\/slike\/[\w./-]+$/i.test(v) && !v.includes('..')) return v;
    return null;
}

// Iz tijela zahtjeva slozi uredeni popis slika (prva = naslovna) i spremi uploade.
// Vraca { naslovna, galerija } gdje su sve vrijednosti spremljene putanje/URL-ovi.
async function obradiSlike(body, naziv) {
    const ulazi = Array.isArray(body.slike) ? body.slike : [];
    const putanje = [];
    for (const unos of ulazi) {
        const putanja = await rijesiSliku(unos, naziv);
        if (putanja) putanje.push(putanja);
    }
    return { naslovna: putanje[0] || null, galerija: putanje.slice(1) };
}

// Validacija podataka o igri (za dodavanje i uredivanje). Slike se provjeravaju zasebno.
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
    return greske;
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
        // naslovna iz mape ako u bazi nije postavljena (slika rucno ubacena u mapu igre)
        for (const igra of igre) {
            if (!igra.slika_url) {
                const uMapi = await slikeIzMape(igra.naziv);
                if (uMapi.length) igra.slika_url = uMapi[0];
            }
        }
        res.json(igre);
    } catch (greska) {
        next(greska);
    }
});

// GET /api/igre/:id - detalji jedne igre (uz galeriju dodatnih slika)
router.get('/:id', async (req, res, next) => {
    try {
        const [igre] = await baza.query(OSNOVNI_UPIT + ' WHERE i.id = ?', [req.params.id]);
        if (igre.length === 0) {
            return res.status(404).json({ greska: 'Igra nije pronađena.' });
        }
        const igra = igre[0];
        const [slike] = await baza.query('SELECT putanja FROM slike WHERE igra_id = ? ORDER BY id', [igra.id]);

        // spoji slike: baza (naslovna + galerija) + datoteke fizicki u mapi igre,
        // bez duplikata; prva u nizu je naslovna, ostale cine galeriju
        const sve = [];
        if (igra.slika_url) sve.push(igra.slika_url);
        sve.push(...slike.map((s) => s.putanja));
        sve.push(...await slikeIzMape(igra.naziv));
        const jedinstvene = [...new Set(sve)];
        igra.slika_url = jedinstvene[0] || null;
        igra.slike = jedinstvene.slice(1);
        res.json(igra);
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

        const { naziv, izdavac, kategorija, godina, min_igraca, max_igraca, trajanje, tezina, opis, broj_primjeraka } = req.body;
        await osigurajMapu(naziv); // mapa za slike (i kad jos nema slika)

        let slike;
        try {
            slike = await obradiSlike(req.body, naziv);
        } catch (greskaSlike) {
            return res.status(400).json({ greska: greskaSlike.message });
        }

        const [rezultat] = await baza.query(
            `INSERT INTO igre (naziv, izdavac, kategorija, godina, min_igraca, max_igraca, trajanje, tezina, opis, broj_primjeraka, slika_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [naziv.trim(), izdavac.trim(), kategorija.trim(), godina, min_igraca, max_igraca, trajanje, tezina, (opis || '').trim(), broj_primjeraka, slike.naslovna]
        );
        const igraId = rezultat.insertId;
        for (const putanja of slike.galerija) {
            await baza.query('INSERT INTO slike (igra_id, putanja) VALUES (?, ?)', [igraId, putanja]);
        }
        res.status(201).json({ poruka: 'Igra je dodana u katalog.', id: igraId });
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

        const { naziv, izdavac, kategorija, godina, min_igraca, max_igraca, trajanje, tezina, opis, broj_primjeraka } = req.body;

        // igra mora postojati
        const [postoji] = await baza.query('SELECT id FROM igre WHERE id = ?', [req.params.id]);
        if (postoji.length === 0) {
            return res.status(404).json({ greska: 'Igra nije pronađena.' });
        }

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

        await osigurajMapu(naziv);
        let slike;
        try {
            slike = await obradiSlike(req.body, naziv);
        } catch (greskaSlike) {
            return res.status(400).json({ greska: greskaSlike.message });
        }

        await baza.query(
            `UPDATE igre SET naziv = ?, izdavac = ?, kategorija = ?, godina = ?, min_igraca = ?,
                    max_igraca = ?, trajanje = ?, tezina = ?, opis = ?, broj_primjeraka = ?, slika_url = ? WHERE id = ?`,
            [naziv.trim(), izdavac.trim(), kategorija.trim(), godina, min_igraca, max_igraca, trajanje, tezina, (opis || '').trim(), broj_primjeraka, slike.naslovna, req.params.id]
        );
        // zamijeni galeriju: obrisi staru pa upisi novu (prva slika je vec naslovna)
        await baza.query('DELETE FROM slike WHERE igra_id = ?', [req.params.id]);
        for (const putanja of slike.galerija) {
            await baza.query('INSERT INTO slike (igra_id, putanja) VALUES (?, ?)', [req.params.id, putanja]);
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
