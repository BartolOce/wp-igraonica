// =====================================================
// pocetna.js - logika naslovnice
// (dinamičan hero, kategorije, najbolje ocijenjene igre)
// =====================================================

// Prilagodba hero sekcije prijavljenom korisniku
function prilagodiHero() {
    if (!prijavljeniKorisnik) return; // neprijavljeni vide zadani HTML
    document.getElementById('hero-naslov').textContent = `Bok, ${prijavljeniKorisnik.ime}! Spremni za partiju?`;
    document.getElementById('hero-opis').textContent =
        'Pregledajte katalog, rezervirajte novu igru za druženje ili provjerite svoje aktivne posudbe.';
    document.getElementById('hero-gumbi').innerHTML = `
        <a href="igre.html" class="gumb">Pregledaj katalog</a>
        <a href="profil.html" class="gumb gumb-sekundarni">Moje posudbe</a>`;
}

// Prikaz kategorija s brojem igara (izračunato iz dohvaćenih igara)
function prikaziKategorije(igre) {
    const spremnik = document.getElementById('mreza-kategorija');
    const broj = {};
    igre.forEach((i) => { broj[i.kategorija] = (broj[i.kategorija] || 0) + 1; });

    const kategorije = Object.keys(broj).sort((a, b) => a.localeCompare(b, 'hr'));
    spremnik.innerHTML = kategorije.map((kat) => `
        <a class="kartica-kategorija" href="igre.html?kategorija=${encodeURIComponent(kat)}">
            <div class="kutija kutija-kategorija">
                ${ilustracijaKategorije(kat)}
            </div>
            <div class="kategorija-info">
                <span class="kategorija-naziv">${pobjegniHTML(kat)}</span>
                <span class="kategorija-broj">${broj[kat]} ${broj[kat] === 1 ? 'igra' : (broj[kat] < 5 ? 'igre' : 'igara')}</span>
            </div>
        </a>`).join('');
    postaviKarusel(spremnik, document.getElementById('kat-lijevo'), document.getElementById('kat-desno'));
}

// Prikaz 4 najbolje ocijenjene igre
function prikaziIzdvojene(igre) {
    const spremnik = document.getElementById('izdvojene-igre');
    const najbolje = igre
        .filter((i) => i.prosjecna_ocjena !== null)
        .sort((a, b) => b.prosjecna_ocjena - a.prosjecna_ocjena || b.broj_recenzija - a.broj_recenzija)
        .slice(0, 4);

    if (najbolje.length === 0) {
        spremnik.innerHTML = '<div class="ucitavanje">Još nema ocijenjenih igara.</div>';
        return;
    }
    spremnik.innerHTML = najbolje.map(karticaIgreHTML).join('');
    postaviSlusaceSrca(spremnik);
    postaviKarusel(spremnik, document.getElementById('izd-lijevo'), document.getElementById('izd-desno'));
}

// Koraci posudbe (interaktivni stepper)
const KORACI = [
    { ikona: '📝', naslov: 'Registrirajte se', tekst: 'Otvorite besplatni korisnički račun. Članstvo vam omogućuje rezervaciju igara, popis omiljenih i pisanje recenzija nakon posudbe.' },
    { ikona: '🎲', naslov: 'Rezervirajte igru', tekst: 'Pronađite igru u katalogu i rezervirajte je jednim klikom. Rezervaciju možete otkazati sve dok je ne preuzmete.' },
    { ikona: '📍', naslov: 'Preuzmite na šalteru', tekst: 'Dođite po igru u igraonicu na adresi Ilica 42, Zagreb. Djelatnik potvrđuje preuzimanje i tada počinje rok posudbe od 14 dana.' },
    { ikona: '↩️', naslov: 'Igrajte i vratite', tekst: 'Uživajte u igri, a po povratku djelatnik potvrđuje vraćanje. Nakon što ste igru posudili, možete napisati recenziju.' }
];
let aktivniKorak = 0;

function prikaziKorak(i) {
    aktivniKorak = Math.max(0, Math.min(KORACI.length - 1, i));
    const k = KORACI[aktivniKorak];
    document.getElementById('stepper-sadrzaj').innerHTML = `
        <div class="stepper-kartica">
            <div class="stepper-ikona">${k.ikona}</div>
            <h3>${aktivniKorak + 1}. ${pobjegniHTML(k.naslov)}</h3>
            <p>${pobjegniHTML(k.tekst)}</p>
        </div>`;
    document.querySelectorAll('.stepper-tab').forEach((t, idx) => {
        t.classList.toggle('aktivna', idx === aktivniKorak);
    });
    document.getElementById('stepper-prethodni').disabled = aktivniKorak === 0;
    document.getElementById('stepper-sljedeci').disabled = aktivniKorak === KORACI.length - 1;
    document.getElementById('stepper-brojac').textContent = `${aktivniKorak + 1} / ${KORACI.length}`;
}

function postaviStepper() {
    const tabovi = document.getElementById('stepper-tabovi');
    tabovi.innerHTML = KORACI.map((k, i) => `
        <button class="stepper-tab" type="button" data-korak="${i}">
            <span class="stepper-broj">${i + 1}</span>${pobjegniHTML(k.naslov)}
        </button>`).join('');
    tabovi.querySelectorAll('.stepper-tab').forEach((t) => {
        t.addEventListener('click', () => prikaziKorak(Number(t.dataset.korak)));
    });
    document.getElementById('stepper-prethodni').addEventListener('click', () => prikaziKorak(aktivniKorak - 1));
    document.getElementById('stepper-sljedeci').addEventListener('click', () => prikaziKorak(aktivniKorak + 1));
    prikaziKorak(0);
}

document.addEventListener('DOMContentLoaded', async () => {
    await korisnikUcitan; // ceka provjeru sesije i ucitavanje omiljenih
    prilagodiHero();
    postaviStepper();

    try {
        const igre = await apiZahtjev('/api/igre');
        prikaziKategorije(igre);
        prikaziIzdvojene(igre);
    } catch (greska) {
        document.getElementById('mreza-kategorija').innerHTML =
            `<div class="ucitavanje">${pobjegniHTML(greska.message)}</div>`;
    }

    // pretraga s naslovnice vodi u katalog s upisanim pojmom
    document.getElementById('forma-pretraga').addEventListener('submit', (dogadaj) => {
        dogadaj.preventDefault();
        const pojam = document.getElementById('pretraga-unos').value.trim();
        location.href = pojam ? `igre.html?pretraga=${encodeURIComponent(pojam)}` : 'igre.html';
    });
});
