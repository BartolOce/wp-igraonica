// =====================================================
// katalog.js - katalog igara
// Igre se jednom dohvate AJAX-om, a pretraga, filtriranje
// i sortiranje obavljaju se na klijentskoj strani.
// =====================================================

let sveIgre = [];

// Primjena svih filtara i sortiranja nad podacima u memoriji
function primijeniFiltre() {
    const pojam = document.getElementById('filtar-pretraga').value.trim().toLowerCase();
    const kategorija = document.getElementById('filtar-kategorija').value;
    const brojIgraca = document.getElementById('filtar-igraci').value;
    const tezina = document.getElementById('filtar-tezina').value;
    const sortiranje = document.getElementById('filtar-sortiranje').value;
    const samoDostupne = document.getElementById('filtar-dostupne').checked;

    let rezultat = sveIgre.filter((igra) => {
        const odgovaraPojmu =
            igra.naziv.toLowerCase().includes(pojam) ||
            igra.izdavac.toLowerCase().includes(pojam);
        const odgovaraKategoriji = kategorija === '' || igra.kategorija === kategorija;
        const odgovaraTezini = tezina === '' || igra.tezina === tezina;
        const odgovaraDostupnosti = !samoDostupne || Number(igra.dostupno) > 0;

        // broj igraca: igra odgovara ako podrzava odabrani broj (min <= n <= max).
        // za "6" filtriramo sve igre koje podrzavaju 6 ili vise igraca.
        let odgovaraIgracima = true;
        if (brojIgraca !== '') {
            const n = Number(brojIgraca);
            odgovaraIgracima = n === 6
                ? igra.max_igraca >= 6
                : igra.min_igraca <= n && igra.max_igraca >= n;
        }
        return odgovaraPojmu && odgovaraKategoriji && odgovaraTezini && odgovaraDostupnosti && odgovaraIgracima;
    });

    rezultat.sort((a, b) => {
        switch (sortiranje) {
            case 'izdavac': return a.izdavac.localeCompare(b.izdavac, 'hr');
            case 'godina': return b.godina - a.godina;
            case 'trajanje': return a.trajanje - b.trajanje;
            case 'ocjena': return (b.prosjecna_ocjena ?? 0) - (a.prosjecna_ocjena ?? 0);
            default: return a.naziv.localeCompare(b.naziv, 'hr');
        }
    });

    prikaziIgre(rezultat);
}

// Dinamicki prikaz rezultata u mrezi kartica
function prikaziIgre(igre) {
    const mreza = document.getElementById('mreza-igara');
    const nemaRezultata = document.getElementById('nema-rezultata');
    const brojac = document.getElementById('brojac-rezultata');

    brojac.textContent = `Prikazano ${igre.length} od ukupno ${sveIgre.length} igara`;

    if (igre.length === 0) {
        mreza.innerHTML = '';
        nemaRezultata.style.display = 'block';
        return;
    }
    nemaRezultata.style.display = 'none';
    mreza.innerHTML = igre.map(karticaIgreHTML).join('');
    postaviSlusaceSrca(mreza); // ozici "srce" gumbe za omiljene
}

// Punjenje padajuceg izbornika kategorija s API-ja
async function ucitajKategorije() {
    try {
        const kategorije = await apiZahtjev('/api/igre/kategorije');
        const izbornik = document.getElementById('filtar-kategorija');
        kategorije.forEach((kategorija) => {
            const opcija = document.createElement('option');
            opcija.value = kategorija;
            opcija.textContent = kategorija;
            izbornik.appendChild(opcija);
        });
    } catch (greska) {
        // izbornik kategorija nije kljucan - katalog radi i bez njega
        console.error('Greška pri učitavanju kategorija:', greska.message);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await korisnikUcitan; // ceka sesiju i omiljene (za ispravan prikaz srca)

    // pojam pretrage ili kategorija mogu stici kroz URL (?pretraga=... / ?kategorija=...)
    const parametri = new URLSearchParams(location.search);
    document.getElementById('filtar-pretraga').value = parametri.get('pretraga') || '';

    await ucitajKategorije();
    // kategorija iz URL-a (npr. dolazak s naslovnice) - postavi nakon punjenja izbornika
    const kategorijaURL = parametri.get('kategorija');
    if (kategorijaURL) {
        const izbornik = document.getElementById('filtar-kategorija');
        if ([...izbornik.options].some((o) => o.value === kategorijaURL)) {
            izbornik.value = kategorijaURL;
        }
    }

    try {
        sveIgre = await apiZahtjev('/api/igre');
        primijeniFiltre();
    } catch (greska) {
        document.getElementById('mreza-igara').innerHTML =
            `<div class="ucitavanje">${pobjegniHTML(greska.message)}</div>`;
        return;
    }

    // reagiranje na svaku promjenu filtara - bez ponovnog ucitavanja stranice
    document.getElementById('filtar-pretraga').addEventListener('input', primijeniFiltre);
    document.getElementById('filtar-kategorija').addEventListener('change', primijeniFiltre);
    document.getElementById('filtar-igraci').addEventListener('change', primijeniFiltre);
    document.getElementById('filtar-tezina').addEventListener('change', primijeniFiltre);
    document.getElementById('filtar-sortiranje').addEventListener('change', primijeniFiltre);
    document.getElementById('filtar-dostupne').addEventListener('change', primijeniFiltre);
});
