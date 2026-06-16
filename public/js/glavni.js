// =====================================================
// glavni.js - zajednicke funkcije za sve stranice
// (AJAX pomocnik, dinamicka navigacija, toast obavijesti)
// =====================================================

// Lokacija igraonice (preuzimanje i vracanje igara) - izmisljeno mjesto
const LOKACIJA = {
    naziv: 'Igraonica Kockica',
    adresa: 'Ilica 42, 10000 Zagreb',
    mapaLink: 'https://www.google.com/maps?q=45.8131,15.9694'
};

// Trenutno prijavljeni korisnik (null ako nitko nije prijavljen)
let prijavljeniKorisnik = null;

// Skup ID-eva omiljenih igara prijavljenog korisnika (za prikaz "srca")
let omiljeneIds = new Set();

// AJAX pomocna funkcija - svi zahtjevi prema API-ju idu kroz nju.
// Podaci se razmjenjuju iskljucivo u JSON obliku.
async function apiZahtjev(url, opcije = {}) {
    const postavke = {
        headers: { 'Content-Type': 'application/json' },
        ...opcije
    };
    if (postavke.body && typeof postavke.body !== 'string') {
        postavke.body = JSON.stringify(postavke.body);
    }

    const odgovor = await fetch(url, postavke);
    let podaci = {};
    try {
        podaci = await odgovor.json();
    } catch (e) { /* odgovor bez tijela */ }

    if (!odgovor.ok) {
        const greska = new Error(podaci.greska || 'Greška u komunikaciji s poslužiteljem.');
        greska.status = odgovor.status;
        greska.polja = podaci.polja || null;
        throw greska;
    }
    return podaci;
}

// Zastita od XSS napada - korisnicki tekst se nikad ne ubacuje sirovo u HTML
function pobjegniHTML(tekst) {
    const div = document.createElement('div');
    div.textContent = String(tekst ?? '');
    return div.innerHTML;
}

// Pretvara ocjenu (npr. 4.2) u prikaz zvjezdicama
function zvjezdice(ocjena) {
    if (ocjena === null || ocjena === undefined) return '<small>Još nema ocjena</small>';
    const broj = Math.round(Number(ocjena));
    return '★'.repeat(broj) + '☆'.repeat(5 - broj);
}

// Sadrzaj "kutije" igre: prava slika (ako postoji) ili tematska ilustracija.
// SVG ilustracija je uvijek u podlozi pa sluzi i kao zamjena ako se slika
// ne uspije ucitati (img.onerror -> slika se sakrije, ostaje ilustracija).
function kutijaIgreHTML(igra) {
    const ilustracija = ilustracijaKategorije(igra.kategorija);
    const slika = igra.slika_url
        ? `<img class="kutija-slika" src="${pobjegniHTML(igra.slika_url)}"
                alt="Slika igre ${pobjegniHTML(igra.naziv)}" loading="lazy"
                onerror="this.style.display='none'">`
        : '';
    return `
        <div class="kutija" style="--boja-kategorije: ${bojaKategorije(igra.kategorija)}">
            ${ilustracija}
            ${slika}
            ${srceGumbHTML(igra.id)}
            <div class="kutija-naljepnica">
                <div class="kutija-naziv">${pobjegniHTML(igra.naziv)}</div>
                <div class="kutija-izdavac">${pobjegniHTML(igra.izdavac)}</div>
            </div>
        </div>`;
}

// HTML gumba "srce" za omiljene (samo za prijavljene korisnike)
function srceGumbHTML(igraId) {
    if (!prijavljeniKorisnik) return '';
    const aktivna = omiljeneIds.has(Number(igraId));
    return `<button class="srce ${aktivna ? 'aktivno' : ''}" type="button" data-omiljena="${igraId}"
            aria-label="Omiljeno" title="${aktivna ? 'Ukloni iz omiljenih' : 'Dodaj u omiljene'}">${aktivna ? '♥' : '♡'}</button>`;
}

// Ozici sve "srce" gumbe unutar spremnika (kartica je <a> pa sprjecavamo navigaciju).
// Neobvezni "naPromjenu" poziva se nakon prebacivanja omiljene (npr. da profil
// osvjezi popis i ukloni karticu koja je upravo maknuta iz omiljenih).
function postaviSlusaceSrca(spremnik, naPromjenu) {
    spremnik.querySelectorAll('[data-omiljena]').forEach((gumb) => {
        gumb.addEventListener('click', async (dogadaj) => {
            dogadaj.preventDefault();
            dogadaj.stopPropagation();
            await prebaciOmiljenu(Number(gumb.dataset.omiljena), gumb);
            if (naPromjenu) naPromjenu();
        });
    });
}

// Dodaj/ukloni igru iz omiljenih (AJAX) i osvjezi izgled gumba
async function prebaciOmiljenu(igraId, gumb) {
    const bilaAktivna = omiljeneIds.has(igraId);
    try {
        if (bilaAktivna) {
            await apiZahtjev('/api/omiljene/' + igraId, { method: 'DELETE' });
            omiljeneIds.delete(igraId);
        } else {
            await apiZahtjev('/api/omiljene', { method: 'POST', body: { igra_id: igraId } });
            omiljeneIds.add(igraId);
        }
        if (gumb) {
            const aktivna = !bilaAktivna;
            gumb.classList.toggle('aktivno', aktivna);
            gumb.textContent = aktivna ? '♥' : '♡';
            gumb.title = aktivna ? 'Ukloni iz omiljenih' : 'Dodaj u omiljene';
        }
        prikaziToast(bilaAktivna ? 'Uklonjeno iz omiljenih.' : 'Dodano u omiljene.');
    } catch (greska) {
        prikaziToast(greska.message, 'greska');
    }
}

// Dohvat ID-eva omiljenih igara prijavljenog korisnika
async function ucitajOmiljene() {
    if (!prijavljeniKorisnik) {
        omiljeneIds = new Set();
        return;
    }
    try {
        const ids = await apiZahtjev('/api/omiljene/ids');
        omiljeneIds = new Set(ids.map(Number));
    } catch (greska) {
        omiljeneIds = new Set();
    }
}

// Oznaka (badge) stanja posudbe - koristi se na profilu i u administraciji
function oznakaStatusa(status) {
    const mapa = {
        rezervirano: ['znacka-rok', 'Rezervirano'],
        preuzeto: ['znacka-dostupno', 'Preuzeto'],
        vraceno: ['znacka-zanr', 'Vraćeno'],
        otkazano: ['znacka-nedostupno', 'Otkazano']
    };
    const [klasa, tekst] = mapa[status] || ['znacka-zanr', status];
    return `<span class="znacka ${klasa}">${tekst}</span>`;
}

// Sazet prikaz broja igraca: "2-4 igraca" ili "4 igraca"
function rasponIgraca(min, max) {
    return min === max ? `${min} igrača` : `${min}-${max} igrača`;
}

// Format datuma za prikaz (hrvatski format)
function formatirajDatum(vrijednost) {
    if (!vrijednost) return '-';
    return new Date(vrijednost).toLocaleDateString('hr-HR', {
        day: 'numeric', month: 'numeric', year: 'numeric'
    });
}

// HTML jedne kartice igre (koristi se na naslovnici i u katalogu)
function karticaIgreHTML(igra) {
    const dostupna = Number(igra.dostupno) > 0;
    return `
        <a class="kartica-igra" href="igra.html?id=${igra.id}">
            ${kutijaIgreHTML(igra)}
            <div class="kartica-tijelo">
                <span class="znacka znacka-zanr kartica-kategorija">${pobjegniHTML(igra.kategorija)}</span>
                <h3>${pobjegniHTML(igra.naziv)}</h3>
                <div class="kartica-meta">👥 ${rasponIgraca(igra.min_igraca, igra.max_igraca)} · ⏱️ ${igra.trajanje} min</div>
                <div class="kartica-dno">
                    <span class="zvjezdice" title="Prosječna ocjena: ${igra.prosjecna_ocjena ?? 'nema'}">
                        ${zvjezdice(igra.prosjecna_ocjena)}
                    </span>
                    <span class="znacka ${dostupna ? 'znacka-dostupno' : 'znacka-nedostupno'}">
                        ${dostupna ? 'Dostupno' : 'Posuđeno'}
                    </span>
                </div>
            </div>
        </a>`;
}

// Toast obavijest u donjem desnom kutu.
// Ostaje prikazana dok je korisnik ne zatvori klikom (na poruku ili na ×).
function prikaziToast(poruka, tip = 'uspjeh') {
    const spremnik = document.getElementById('toast-spremnik');
    if (!spremnik) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${tip}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `<span class="toast-tekst"></span><button class="toast-zatvori" type="button" aria-label="Zatvori">&times;</button>`;
    toast.querySelector('.toast-tekst').textContent = poruka;
    toast.addEventListener('click', () => toast.remove());
    spremnik.appendChild(toast);
}

// Modalni prozor preko cijele stranice. Vraca Promise koji se rjesava kad ga
// korisnik zatvori (klik na gumb ili izvan prozora). Sadrzaj se prima kao HTML,
// pa pozivatelj mora pobjeci ('escape') sve korisnicke podatke.
function prikaziModal({ naslov, sadrzajHTML, tekstGumba = 'U redu' }) {
    return new Promise((resolve) => {
        const prekrivac = document.createElement('div');
        prekrivac.className = 'modal-prekrivac';
        prekrivac.innerHTML = `
            <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-naslov">
                <h2 id="modal-naslov">${pobjegniHTML(naslov)}</h2>
                <div class="modal-tijelo">${sadrzajHTML}</div>
                <div class="modal-dno">
                    <button class="gumb" type="button">${pobjegniHTML(tekstGumba)}</button>
                </div>
            </div>`;
        const zatvori = () => { prekrivac.remove(); resolve(); };
        prekrivac.querySelector('.modal-dno button').addEventListener('click', zatvori);
        prekrivac.addEventListener('click', (dogadaj) => {
            if (dogadaj.target === prekrivac) zatvori(); // klik izvan prozora zatvara
        });
        document.body.appendChild(prekrivac);
    });
}

// --- Dinamicka navigacija ---
// Ovisno o tome je li korisnik prijavljen, u izbornik se dodaju
// razlicite poveznice (Prijava/Registracija ili Profil/Odjava).
function azurirajNavigaciju() {
    const centar = document.getElementById('nav-veze');   // podstranice (sredina)
    const desno = document.getElementById('nav-auth');    // prijava/profil (desno)
    if (!centar || !desno) return;

    centar.querySelectorAll('.nav-dinamicki').forEach((el) => el.remove());
    desno.innerHTML = '';

    const dodaj = (spremnik, html) => {
        const li = document.createElement('li');
        li.className = 'nav-dinamicki';
        li.innerHTML = html;
        spremnik.appendChild(li);
        return li;
    };

    if (prijavljeniKorisnik) {
        // navigacijske podstranice u sredini
        if (prijavljeniKorisnik.uloga === 'admin') {
            // administrator radi u administraciji: bez "Moj profil",
            // a skrivamo i staticnu poveznicu "Pocetna"
            const pocetna = centar.querySelector('a[href="index.html"]');
            if (pocetna) pocetna.closest('li').style.display = 'none';
            dodaj(centar, '<a href="admin.html">Administracija</a>');
        } else {
            dodaj(centar, '<a href="profil.html">Moj profil</a>');
        }
        // pozdrav i odjava desno
        dodaj(desno, `<span class="nav-pozdrav">👋 ${pobjegniHTML(prijavljeniKorisnik.ime)}</span>`);
        const liOdjava = dodaj(desno, '<button class="gumb-odjava" type="button">Odjava</button>');
        liOdjava.querySelector('button').addEventListener('click', odjaviSe);
    } else {
        // prijava je obrubljena, registracija ispunjena (poziv na akciju)
        dodaj(desno, '<a href="prijava.html" class="nav-gumb">Prijava</a>');
        dodaj(desno, '<a href="registracija.html" class="nav-gumb nav-gumb-puni">Registracija</a>');
    }

    // oznaci aktivnu stranicu u oba spremnika
    const trenutna = location.pathname.split('/').pop() || 'index.html';
    [centar, desno].forEach((spremnik) => {
        spremnik.querySelectorAll('a').forEach((veza) => {
            if (veza.getAttribute('href') === trenutna) veza.classList.add('aktivna');
        });
    });
}

// Karusel: strelice lijevo/desno skrolaju traku; gumbi se gase na rubovima
function postaviKarusel(traka, lijevo, desno) {
    if (!traka || !lijevo || !desno) return;
    const korak = () => Math.max(Math.round(traka.clientWidth * 0.85), 200);
    lijevo.addEventListener('click', () => traka.scrollBy({ left: -korak(), behavior: 'smooth' }));
    desno.addEventListener('click', () => traka.scrollBy({ left: korak(), behavior: 'smooth' }));
    const azuriraj = () => {
        lijevo.disabled = traka.scrollLeft <= 4;
        desno.disabled = traka.scrollLeft + traka.clientWidth >= traka.scrollWidth - 4;
    };
    traka.addEventListener('scroll', azuriraj);
    window.addEventListener('resize', azuriraj);
    azuriraj();
}

// Odjava korisnika
async function odjaviSe() {
    try {
        await apiZahtjev('/api/auth/odjava', { method: 'POST' });
        prijavljeniKorisnik = null;
        prikaziToast('Uspješno ste odjavljeni.');
        setTimeout(() => { location.href = 'index.html'; }, 600);
    } catch (greska) {
        prikaziToast(greska.message, 'greska');
    }
}

// Provjera sesije na posluzitelju - poziva se pri ucitavanju svake stranice.
// Ostale skripte cekaju ovaj Promise prije vlastite inicijalizacije.
const korisnikUcitan = (async () => {
    try {
        const podaci = await apiZahtjev('/api/auth/ja');
        prijavljeniKorisnik = podaci.korisnik;
    } catch (greska) {
        prijavljeniKorisnik = null;
    }
    await ucitajOmiljene(); // ovisi o tome je li korisnik prijavljen
    return prijavljeniKorisnik;
})();

// Inicijalizacija zajednickih dijelova nakon ucitavanja dokumenta
document.addEventListener('DOMContentLoaded', async () => {
    // hamburger izbornik (mobilni prikaz) - otvara cijelu navigacijsku skupinu
    const hamburger = document.getElementById('hamburger');
    const skupina = document.getElementById('nav-skupina');
    if (hamburger && skupina) {
        hamburger.addEventListener('click', () => {
            const otvoreno = skupina.classList.toggle('otvoreno');
            hamburger.setAttribute('aria-expanded', otvoreno); // stanje izbornika za citace ekrana
        });
    }

    await korisnikUcitan;
    azurirajNavigaciju();

    // godina u podnozju
    const godina = document.getElementById('godina-podnozje');
    if (godina) godina.textContent = new Date().getFullYear();
});
