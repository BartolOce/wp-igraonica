// =====================================================
// igra.js - stranica s detaljima društvene igre
// (galerija, podaci, rezervacija, omiljene, recenzije)
// =====================================================

const igraId = Number(new URLSearchParams(location.search).get('id'));
let trenutnaIgra = null;
let mojePosudbeOveIgre = [];   // posudbe prijavljenog korisnika za OVU igru
let vecRecenzirao = false;

function aktivnaPosudba() {
    return mojePosudbeOveIgre.find((p) => p.status === 'rezervirano' || p.status === 'preuzeto');
}
function posudioIkad() {
    return mojePosudbeOveIgre.some((p) => p.status === 'preuzeto' || p.status === 'vraceno');
}

// Niz "slika" za galeriju: prava slika (ako postoji) + tematske ilustracije
function slajdoviIgre(igra) {
    const slajdovi = [];
    if (igra.slika_url) {
        slajdovi.push(`<img class="galerija-img" src="${pobjegniHTML(igra.slika_url)}"
            alt="Slika igre ${pobjegniHTML(igra.naziv)}">`);
    }
    slajdovi.push(ilustracijaKategorije(igra.kategorija));
    slajdovi.push(ilustracijaKockice(igra.kategorija));
    return slajdovi;
}

// HTML galerije s trakom, strelicama i točkicama
function galerijaHTML(igra) {
    const slajdovi = slajdoviIgre(igra);
    const visestruko = slajdovi.length > 1;
    return `
        <div class="galerija" style="--boja-kategorije: ${bojaKategorije(igra.kategorija)}">
            <div class="galerija-traka" id="galerija-traka">
                ${slajdovi.map((s) => `<div class="galerija-slajd">${s}</div>`).join('')}
            </div>
            ${visestruko ? `
                <button class="galerija-strelica lijevo" id="gal-lijevo" type="button" aria-label="Prethodna"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 6 9 12 15 18"/></svg></button>
                <button class="galerija-strelica desno" id="gal-desno" type="button" aria-label="Sljedeća"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 6 15 12 9 18"/></svg></button>
                <div class="galerija-tockice" id="galerija-tockice">
                    ${slajdovi.map((_, i) => `<button class="galerija-tockica${i === 0 ? ' aktivna' : ''}" type="button" data-idx="${i}" aria-label="Slika ${i + 1}"></button>`).join('')}
                </div>` : ''}
        </div>`;
}

// Upravljanje galerijom (strelice, točkice, scroll)
function postaviGaleriju() {
    const traka = document.getElementById('galerija-traka');
    if (!traka) return;
    const broj = traka.children.length;
    if (broj <= 1) return;

    const lijevo = document.getElementById('gal-lijevo');
    const desno = document.getElementById('gal-desno');
    const tockice = [...document.querySelectorAll('.galerija-tockica')];
    const trenutni = () => Math.round(traka.scrollLeft / traka.clientWidth);
    const idi = (i) => {
        const idx = Math.max(0, Math.min(broj - 1, i));
        traka.scrollTo({ left: idx * traka.clientWidth, behavior: 'smooth' });
    };

    lijevo.addEventListener('click', () => idi(trenutni() - 1));
    desno.addEventListener('click', () => idi(trenutni() + 1));
    tockice.forEach((t) => t.addEventListener('click', () => idi(Number(t.dataset.idx))));

    const azuriraj = () => {
        const idx = trenutni();
        tockice.forEach((t, i) => t.classList.toggle('aktivna', i === idx));
        lijevo.disabled = idx <= 0;
        desno.disabled = idx >= broj - 1;
    };
    traka.addEventListener('scroll', azuriraj);
    azuriraj();
}

// Prikaz detalja igre (galerija + informacije + sekcije opisa)
function prikaziDetalje(igra) {
    const dostupno = Number(igra.dostupno);
    const dostupna = dostupno > 0;
    document.title = `${igra.naziv} | Igraonica`;

    document.getElementById('detalji-igre').innerHTML = `
        <div class="detalji-igre">
            ${galerijaHTML(igra)}
            <div class="detalji-info">
                <h1>${pobjegniHTML(igra.naziv)}</h1>
                <p class="detalji-autor">${pobjegniHTML(igra.izdavac)} · ${igra.godina}.</p>
                <div class="detalji-znacke">
                    <span class="znacka znacka-zanr">${pobjegniHTML(igra.kategorija)}</span>
                    <span class="znacka znacka-tezina">Težina: ${pobjegniHTML(igra.tezina)}</span>
                    <span class="znacka ${dostupna ? 'znacka-dostupno' : 'znacka-nedostupno'}">
                        ${dostupna ? `Dostupno: ${dostupno} od ${igra.broj_primjeraka}` : 'Svi primjerci su zauzeti'}
                    </span>
                </div>
                <div class="svojstva-igre">
                    <div class="svojstvo">
                        <span class="svojstvo-ikona">👥</span>
                        <span class="svojstvo-vrijednost">${rasponIgraca(igra.min_igraca, igra.max_igraca)}</span>
                        <span class="svojstvo-naziv">broj igrača</span>
                    </div>
                    <div class="svojstvo">
                        <span class="svojstvo-ikona">⏱️</span>
                        <span class="svojstvo-vrijednost">${igra.trajanje} min</span>
                        <span class="svojstvo-naziv">trajanje partije</span>
                    </div>
                    <div class="svojstvo">
                        <span class="svojstvo-ikona">🎯</span>
                        <span class="svojstvo-vrijednost">${pobjegniHTML(igra.tezina)}</span>
                        <span class="svojstvo-naziv">složenost</span>
                    </div>
                </div>
                <p class="detalji-opis">${pobjegniHTML(igra.opis)}</p>
                <div class="detalji-redak"><strong>Prosječna ocjena:</strong>
                    <span class="zvjezdice">${zvjezdice(igra.prosjecna_ocjena)}</span>
                    ${igra.prosjecna_ocjena ? `(${igra.prosjecna_ocjena} / 5, ${igra.broj_recenzija} recenzija)` : ''}
                </div>
                <div class="detalji-akcije" id="detalji-akcije"></div>
            </div>
        </div>`;

    postaviSlusaceSrca(document.getElementById('detalji-igre'));
    postaviGaleriju();
    prikaziAkcije(igra, dostupna);
}

// Gumb/poruka za rezervaciju ovisno o stanju prijave i posudbe
function prikaziAkcije(igra, dostupna) {
    const akcije = document.getElementById('detalji-akcije');
    if (!prijavljeniKorisnik) {
        akcije.innerHTML = `<a href="prijava.html" class="gumb">Prijavite se za rezervaciju</a>`;
        return;
    }
    const aktivna = aktivnaPosudba();
    if (aktivna && aktivna.status === 'rezervirano') {
        akcije.innerHTML = `
            <span class="znacka znacka-rok">Rezervirali ste ovu igru</span>
            <span style="color: var(--tinta-svijetla); font-size: 0.9rem;">Preuzmite je na šalteru: ${LOKACIJA.naziv}, ${LOKACIJA.adresa} · upravljanje na <a href="profil.html">profilu</a></span>`;
        return;
    }
    if (aktivna && aktivna.status === 'preuzeto') {
        akcije.innerHTML = `
            <span class="znacka znacka-dostupno">Trenutno je kod vas</span>
            <span style="color: var(--tinta-svijetla); font-size: 0.9rem;">Rok za vraćanje: ${formatirajDatum(aktivna.rok_vracanja)}</span>`;
        return;
    }
    if (!dostupna) {
        akcije.innerHTML = `<button class="gumb" disabled>Nema slobodnih primjeraka</button>`;
        return;
    }
    akcije.innerHTML = `<button class="gumb" id="gumb-rezerviraj">🎲 Rezerviraj igru</button>
        <span style="color: var(--tinta-svijetla); font-size: 0.9rem;">Rok posudbe: 14 dana od preuzimanja</span>`;
    document.getElementById('gumb-rezerviraj').addEventListener('click', rezervirajIgru);
}

// Rezervacija igre (AJAX POST prema API-ju)
async function rezervirajIgru() {
    const gumb = document.getElementById('gumb-rezerviraj');
    gumb.disabled = true;
    try {
        const odgovor = await apiZahtjev('/api/posudbe', { method: 'POST', body: { igra_id: igraId } });
        prikaziToast(odgovor.poruka, 'uspjeh');
        await ucitajIgru();
    } catch (greska) {
        prikaziToast(greska.message, 'greska');
        gumb.disabled = false;
    }
}

// Prikaz prosjecne ocjene u sekciji recenzija
function prikaziProsjek(igra) {
    const prosjek = document.getElementById('prosjek-ocjena');
    if (igra.prosjecna_ocjena === null) {
        prosjek.innerHTML = '<p>Ova igra još nema recenzija - budite prvi koji će je ocijeniti!</p>';
        return;
    }
    prosjek.innerHTML = `
        <span class="prosjek-broj">${igra.prosjecna_ocjena}</span>
        <div>
            <div class="zvjezdice" style="font-size: 1.2rem;">${zvjezdice(igra.prosjecna_ocjena)}</div>
            <div style="color: var(--tinta-svijetla); font-size: 0.9rem;">
                na temelju ${igra.broj_recenzija} recenzija
            </div>
        </div>`;
}

// Dohvat i prikaz svih recenzija igre
async function ucitajRecenzije() {
    const popis = document.getElementById('popis-recenzija');
    vecRecenzirao = false;
    try {
        const recenzije = await apiZahtjev(`/api/recenzije/igra/${igraId}`);
        if (recenzije.length === 0) {
            popis.innerHTML = '';
            return;
        }
        popis.innerHTML = recenzije.map((recenzija) => {
            if (prijavljeniKorisnik && prijavljeniKorisnik.id === recenzija.korisnik_id) vecRecenzirao = true;
            const mojaRecenzija = prijavljeniKorisnik &&
                (prijavljeniKorisnik.id === recenzija.korisnik_id || prijavljeniKorisnik.uloga === 'admin');
            return `
                <article class="recenzija">
                    <div class="recenzija-vrh">
                        <span class="recenzija-autor">${pobjegniHTML(recenzija.ime)} ${pobjegniHTML(recenzija.prezime)}</span>
                        <span class="zvjezdice">${zvjezdice(recenzija.ocjena)}</span>
                        <span class="recenzija-datum">${formatirajDatum(recenzija.datum)}</span>
                    </div>
                    <p>${pobjegniHTML(recenzija.komentar)}</p>
                    ${mojaRecenzija ? `<button class="recenzija-obrisi" data-id="${recenzija.id}">Obriši recenziju</button>` : ''}
                </article>`;
        }).join('');

        popis.querySelectorAll('.recenzija-obrisi').forEach((gumb) => {
            gumb.addEventListener('click', async () => {
                if (!confirm('Želite li sigurno obrisati ovu recenziju?')) return;
                try {
                    const odgovor = await apiZahtjev(`/api/recenzije/${gumb.dataset.id}`, { method: 'DELETE' });
                    prikaziToast(odgovor.poruka);
                    await ucitajIgru();
                } catch (greska) {
                    prikaziToast(greska.message, 'greska');
                }
            });
        });
    } catch (greska) {
        popis.innerHTML = `<div class="ucitavanje">${pobjegniHTML(greska.message)}</div>`;
    }
}

// Prikaz obrasca za recenziju ovisno o tome je li korisnik posudio igru
function azurirajObrazacRecenzije() {
    const kartica = document.getElementById('kartica-recenzija');
    const napomena = document.getElementById('recenzija-prijava-napomena');
    kartica.style.display = 'none';
    napomena.style.display = 'none';

    if (!prijavljeniKorisnik) {
        napomena.innerHTML = '💡 <a href="prijava.html">Prijavite se</a> kako biste rezervirali igru ili napisali recenziju.';
        napomena.style.display = 'block';
        return;
    }
    if (vecRecenzirao) {
        napomena.innerHTML = '✓ Već ste recenzirali ovu igru. Hvala na mišljenju!';
        napomena.style.display = 'block';
        return;
    }
    if (!posudioIkad()) {
        napomena.innerHTML = '🔒 Recenziju možete napisati tek nakon što posudite (preuzmete) ovu igru.';
        napomena.style.display = 'block';
        return;
    }
    kartica.style.display = 'block';
}

// Glavni dohvat podataka (igra + moje posudbe + recenzije)
async function ucitajIgru() {
    try {
        trenutnaIgra = await apiZahtjev(`/api/igre/${igraId}`);
        mojePosudbeOveIgre = [];
        if (prijavljeniKorisnik) {
            try {
                const sve = await apiZahtjev('/api/posudbe/moje');
                mojePosudbeOveIgre = sve.filter((p) => p.igra_id === igraId);
            } catch (e) { /* nije kljucno */ }
        }
        prikaziDetalje(trenutnaIgra);
        prikaziProsjek(trenutnaIgra);
        document.getElementById('sekcija-recenzije').style.display = 'block';
        await ucitajRecenzije();
        azurirajObrazacRecenzije();
    } catch (greska) {
        document.getElementById('detalji-igre').innerHTML =
            `<div class="ucitavanje">${pobjegniHTML(greska.message)} <br><br>
             <a href="igre.html" class="gumb gumb-sekundarni gumb-mali">Natrag na katalog</a></div>`;
    }
}

// Slanje nove recenzije s klijentskom validacijom
async function posaljiRecenziju(dogadaj) {
    dogadaj.preventDefault();
    const forma = dogadaj.target;
    const odabranaOcjena = forma.querySelector('input[name="ocjena"]:checked');
    const komentarUnos = document.getElementById('komentar');
    const greskaOcjena = document.getElementById('greska-ocjena');

    let ispravno = true;
    if (!odabranaOcjena) {
        greskaOcjena.textContent = 'Odaberite ocjenu od 1 do 5 zvjezdica.';
        greskaOcjena.style.display = 'block';
        ispravno = false;
    } else {
        greskaOcjena.style.display = 'none';
    }
    const porukaKomentar = Validacija.minDuljina(komentarUnos.value, 10, 'Komentar');
    postaviGresku(komentarUnos, porukaKomentar);
    if (porukaKomentar) ispravno = false;
    if (!ispravno) return;

    try {
        const odgovor = await apiZahtjev('/api/recenzije', {
            method: 'POST',
            body: { igra_id: igraId, ocjena: Number(odabranaOcjena.value), komentar: komentarUnos.value.trim() }
        });
        prikaziToast(odgovor.poruka, 'uspjeh');
        forma.reset();
        await ucitajIgru();
    } catch (greska) {
        prikaziToast(greska.message, 'greska');
        if (greska.polja) prikaziGreskePosluzitelja(forma, greska.polja);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!igraId) {
        location.href = 'igre.html';
        return;
    }
    await korisnikUcitan;
    document.getElementById('forma-recenzija').addEventListener('submit', posaljiRecenziju);
    await ucitajIgru();
});
