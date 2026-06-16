// =====================================================
// admin-katalog.js - upravljanje katalogom igara
// (dodavanje, uređivanje i brisanje - samo admin)
// =====================================================

let nacinUredivanja = false; // false = dodavanje nove igre, true = uredivanje postojece

const polja = () => ({
    naziv: document.getElementById('naziv'),
    izdavac: document.getElementById('izdavac'),
    kategorija: document.getElementById('kategorija'),
    godina: document.getElementById('godina'),
    min_igraca: document.getElementById('min-igraca'),
    max_igraca: document.getElementById('max-igraca'),
    trajanje: document.getElementById('trajanje'),
    tezina: document.getElementById('tezina'),
    broj_primjeraka: document.getElementById('broj-primjeraka'),
    slika_url: document.getElementById('slika-url'),
    opis: document.getElementById('opis')
});

const trenutnaGodina = new Date().getFullYear();

// pravila klijentske validacije obrasca igre
const pravilaIgre = {
    naziv: (v) => Validacija.obavezno(v, 'Naziv je obvezan.'),
    izdavac: (v) => Validacija.minDuljina(v, 2, 'Naziv izdavača'),
    kategorija: (v) => Validacija.minDuljina(v, 2, 'Kategorija'),
    godina: (v) => Validacija.broj(v, 0, trenutnaGodina, 'Godina'),
    min_igraca: (v) => Validacija.broj(v, 1, 20, 'Najmanji broj igrača'),
    max_igraca: (v) => Validacija.broj(v, 1, 20, 'Najveći broj igrača'),
    trajanje: (v) => Validacija.broj(v, 1, 1000, 'Trajanje'),
    tezina: (v) => (['lagana', 'srednja', 'teška'].includes(v) ? '' : 'Odaberite težinu.'),
    broj_primjeraka: (v) => Validacija.broj(v, 1, 100, 'Broj primjeraka'),
    // URL slike je neobvezan: prazno je u redu, inace mora biti http(s) poveznica
    slika_url: (v) => (!v || v.trim() === '' || /^https?:\/\/.+/i.test(v.trim()) || /^\/[^\s]+$/.test(v.trim()) ? '' : 'Unesite http(s):// poveznicu ili lokalnu putanju (npr. /slike/5/box.jpg).'),
    opis: (v) => Validacija.minDuljina(v, 10, 'Opis')
};

// Ucitavanje svih igara u tablicu
async function ucitajTablicu() {
    const tijelo = document.getElementById('tablica-igre');
    try {
        const igre = await apiZahtjev('/api/igre');
        document.getElementById('broj-igara').textContent = igre.length;

        if (igre.length === 0) {
            tijelo.innerHTML = '<tr><td colspan="8" class="tablica-prazno">Katalog je prazan.</td></tr>';
            return;
        }
        tijelo.innerHTML = igre.map((i) => `
            <tr>
                <td><a href="igra.html?id=${i.id}">${pobjegniHTML(i.naziv)}</a><br>
                    <small style="color: var(--tinta-svijetla);">${pobjegniHTML(i.izdavac)} · ${i.godina}.</small></td>
                <td>${pobjegniHTML(i.kategorija)}</td>
                <td>${rasponIgraca(i.min_igraca, i.max_igraca)}</td>
                <td>${i.trajanje} min</td>
                <td style="text-transform: capitalize;">${pobjegniHTML(i.tezina)}</td>
                <td>${i.broj_primjeraka}</td>
                <td>${Number(i.dostupno) > 0
                    ? `<span class="znacka znacka-dostupno">${i.dostupno}</span>`
                    : '<span class="znacka znacka-nedostupno">0</span>'}</td>
                <td style="white-space: nowrap;">
                    <button class="gumb gumb-mali gumb-sekundarni" data-uredi="${i.id}">Uredi</button>
                    <button class="gumb gumb-mali gumb-opasno" data-obrisi="${i.id}">Obriši</button>
                </td>
            </tr>`).join('');

        // gumb "Uredi" - puni obrazac podacima odabrane igre
        tijelo.querySelectorAll('[data-uredi]').forEach((gumb) => {
            gumb.addEventListener('click', () => {
                const igra = igre.find((i) => i.id === Number(gumb.dataset.uredi));
                pokreniUredivanje(igra);
            });
        });

        // gumb "Obriši" - uz potvrdu korisnika
        tijelo.querySelectorAll('[data-obrisi]').forEach((gumb) => {
            gumb.addEventListener('click', async () => {
                const igra = igre.find((i) => i.id === Number(gumb.dataset.obrisi));
                const potvrda = confirm(
                    `Želite li sigurno obrisati igru "${igra.naziv}"?\n` +
                    'Brišu se i sve njezine posudbe i recenzije.'
                );
                if (!potvrda) return;
                try {
                    const odgovor = await apiZahtjev(`/api/igre/${igra.id}`, { method: 'DELETE' });
                    prikaziToast(odgovor.poruka, 'uspjeh');
                    await ucitajTablicu();
                } catch (greska) {
                    prikaziToast(greska.message, 'greska');
                }
            });
        });
    } catch (greska) {
        tijelo.innerHTML = `<tr><td colspan="8" class="tablica-prazno">${pobjegniHTML(greska.message)}</td></tr>`;
    }
}

// Punjenje datalist-e postojecim kategorijama (pomoc pri upisu)
async function ucitajKategorije() {
    try {
        const kategorije = await apiZahtjev('/api/igre/kategorije');
        document.getElementById('popis-kategorija').innerHTML =
            kategorije.map((k) => `<option value="${pobjegniHTML(k)}"></option>`).join('');
    } catch (greska) { /* nije kljucno za rad stranice */ }
}

// Prebacivanje obrasca u nacin uredivanja
function pokreniUredivanje(igra) {
    nacinUredivanja = true;
    document.getElementById('igra-id').value = igra.id;
    const p = polja();
    p.naziv.value = igra.naziv;
    p.izdavac.value = igra.izdavac;
    p.kategorija.value = igra.kategorija;
    p.godina.value = igra.godina;
    p.min_igraca.value = igra.min_igraca;
    p.max_igraca.value = igra.max_igraca;
    p.trajanje.value = igra.trajanje;
    p.tezina.value = igra.tezina;
    p.broj_primjeraka.value = igra.broj_primjeraka;
    p.slika_url.value = igra.slika_url || '';
    p.opis.value = igra.opis || '';

    document.getElementById('forma-naslov').textContent = `Uredi igru: ${igra.naziv}`;
    document.getElementById('gumb-spremi').textContent = 'Spremi promjene';
    document.getElementById('gumb-odustani').style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Povratak obrasca u nacin dodavanja
function prekiniUredivanje() {
    nacinUredivanja = false;
    document.getElementById('forma-igra').reset();
    document.getElementById('igra-id').value = '';
    document.getElementById('forma-naslov').textContent = 'Dodaj novu igru';
    document.getElementById('gumb-spremi').textContent = 'Dodaj igru';
    document.getElementById('gumb-odustani').style.display = 'none';
    Object.values(polja()).forEach((input) => postaviGresku(input, ''));
}

// Slanje obrasca (dodavanje ili uredivanje)
async function spremiIgru(dogadaj) {
    dogadaj.preventDefault();
    const p = polja();

    // validacija svih polja na klijentskoj strani
    let sveIspravno = true;
    Object.entries(p).forEach(([naziv, input]) => {
        if (!provjeriPolje(input, pravilaIgre[naziv])) sveIspravno = false;
    });
    // dodatna provjera: najveci broj igraca >= najmanji
    if (sveIspravno && Number(p.max_igraca.value) < Number(p.min_igraca.value)) {
        postaviGresku(p.max_igraca, 'Najveći broj igrača ne smije biti manji od najmanjeg.');
        sveIspravno = false;
    }
    if (!sveIspravno) return;

    const podaci = {
        naziv: p.naziv.value.trim(),
        izdavac: p.izdavac.value.trim(),
        kategorija: p.kategorija.value.trim(),
        godina: Number(p.godina.value),
        min_igraca: Number(p.min_igraca.value),
        max_igraca: Number(p.max_igraca.value),
        trajanje: Number(p.trajanje.value),
        tezina: p.tezina.value,
        broj_primjeraka: Number(p.broj_primjeraka.value),
        slika_url: p.slika_url.value.trim(),
        opis: p.opis.value.trim()
    };

    try {
        let odgovor;
        if (nacinUredivanja) {
            const id = document.getElementById('igra-id').value;
            odgovor = await apiZahtjev(`/api/igre/${id}`, { method: 'PUT', body: podaci });
        } else {
            odgovor = await apiZahtjev('/api/igre', { method: 'POST', body: podaci });
        }
        prikaziToast(odgovor.poruka, 'uspjeh');
        prekiniUredivanje();
        await Promise.all([ucitajTablicu(), ucitajKategorije()]);
    } catch (greska) {
        prikaziToast(greska.message, 'greska');
        prikaziGreskePosluzitelja(document.getElementById('forma-igra'), greska.polja);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await korisnikUcitan;
    // pristup ima samo administrator
    if (!prijavljeniKorisnik || prijavljeniKorisnik.uloga !== 'admin') {
        location.href = prijavljeniKorisnik ? 'index.html' : 'prijava.html';
        return;
    }

    document.getElementById('forma-igra').addEventListener('submit', spremiIgru);
    document.getElementById('gumb-odustani').addEventListener('click', prekiniUredivanje);

    await Promise.all([ucitajTablicu(), ucitajKategorije()]);
});
