// =====================================================
// profil.js - korisnicki profil, posudbe i omiljene igre
// =====================================================

// Prikaz osobnih podataka prijavljenog korisnika
function prikaziProfil() {
    const inicijali = (prijavljeniKorisnik.ime[0] + prijavljeniKorisnik.prezime[0]).toUpperCase();
    const admin = prijavljeniKorisnik.uloga === 'admin';
    document.getElementById('profil-kartica').innerHTML = `
        <div class="avatar">${pobjegniHTML(inicijali)}</div>
        <h2>${pobjegniHTML(prijavljeniKorisnik.ime)} ${pobjegniHTML(prijavljeniKorisnik.prezime)}</h2>
        <p>${pobjegniHTML(prijavljeniKorisnik.email)}</p>
        <span class="znacka ${admin ? 'znacka-rok' : 'znacka-zanr'}">
            ${admin ? '🔧 Administrator' : '🎲 Član igraonice'}
        </span>`;
}

// Status roka vracanja za preuzete igre (u roku / istice danas / prekoracen)
function statusRoka(rokVracanja) {
    const danas = new Date();
    danas.setHours(0, 0, 0, 0);
    const rok = new Date(rokVracanja);
    rok.setHours(0, 0, 0, 0);
    const razlikaDana = Math.round((rok - danas) / (1000 * 60 * 60 * 24));

    if (razlikaDana < 0) {
        return `<span class="znacka znacka-nedostupno">Kasni ${Math.abs(razlikaDana)} d.</span>`;
    }
    if (razlikaDana === 0) {
        return '<span class="znacka znacka-rok">Rok ističe danas!</span>';
    }
    return `<span class="znacka znacka-dostupno">Još ${razlikaDana} d.</span>`;
}

// Redak igre s nazivom i izdavacem (poveznica na detalje)
function celijaIgre(p) {
    return `<a href="igra.html?id=${p.igra_id}">${pobjegniHTML(p.naziv)}</a><br>
            <small style="color: var(--tinta-svijetla);">${pobjegniHTML(p.izdavac)}</small>`;
}

// Broj dana od danas do roka (negativno = rok je prosao)
function daniDoRoka(rok) {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    const r = new Date(rok); r.setHours(0, 0, 0, 0);
    return Math.round((r - d) / 86400000);
}

// Obavijest na vrhu profila kad rok posudbe istjece ili je prosao
function prikaziObavijestiRoka(posudbe) {
    const spremnik = document.getElementById('obavijesti');
    if (!spremnik) return;
    const poruke = [];
    posudbe.filter((p) => p.status === 'preuzeto').forEach((p) => {
        const dani = daniDoRoka(p.rok_vracanja);
        if (dani < 0) {
            poruke.push({ tip: 'kasni', tekst: `Igra „${p.naziv}" kasni ${Math.abs(dani)} d. — vratite je u igraonicu što prije.` });
        } else if (dani <= 2) {
            const kada = dani === 0 ? 'danas' : `za ${dani} d.`;
            poruke.push({ tip: 'uskoro', tekst: `Rok za vraćanje igre „${p.naziv}" ističe ${kada} (${formatirajDatum(p.rok_vracanja)}).` });
        }
    });
    spremnik.innerHTML = poruke.map((o) =>
        `<div class="obavijest-rok obavijest-${o.tip}">⏰ ${pobjegniHTML(o.tekst)}</div>`).join('');
}

// Dohvat svih posudbi korisnika i prikaz u dvjema tablicama
async function ucitajPosudbe() {
    const aktivneTijelo = document.getElementById('aktivne-posudbe');
    const povijestTijelo = document.getElementById('povijest-posudbi');

    try {
        const posudbe = await apiZahtjev('/api/posudbe/moje');
        prikaziObavijestiRoka(posudbe);
        const aktivne = posudbe.filter((p) => p.status === 'rezervirano' || p.status === 'preuzeto');
        const povijest = posudbe.filter((p) => p.status === 'vraceno' || p.status === 'otkazano');

        // --- aktivne (rezervirano / preuzeto) ---
        if (aktivne.length === 0) {
            aktivneTijelo.innerHTML = `
                <tr><td colspan="4" class="tablica-prazno">
                    Nemate aktivnih rezervacija. <a href="igre.html">Pogledajte katalog</a>.
                </td></tr>`;
        } else {
            aktivneTijelo.innerHTML = aktivne.map((p) => {
                let rok, akcija;
                if (p.status === 'rezervirano') {
                    rok = '<span style="color: var(--tinta-svijetla);">nakon preuzimanja</span>';
                    akcija = `<button class="gumb gumb-mali gumb-opasno" data-otkazi="${p.id}">Otkaži</button>`;
                } else { // preuzeto
                    rok = `${formatirajDatum(p.rok_vracanja)} ${statusRoka(p.rok_vracanja)}`;
                    akcija = '<span style="color: var(--tinta-svijetla); font-size: 0.85rem;">kod vas</span>';
                }
                return `<tr>
                    <td>${celijaIgre(p)}</td>
                    <td>${oznakaStatusa(p.status)}</td>
                    <td>${rok}</td>
                    <td>${akcija}</td>
                </tr>`;
            }).join('');

            // otkazivanje rezervacije
            aktivneTijelo.querySelectorAll('[data-otkazi]').forEach((gumb) => {
                gumb.addEventListener('click', async () => {
                    if (!confirm('Otkazati ovu rezervaciju?')) return;
                    gumb.disabled = true;
                    try {
                        const odgovor = await apiZahtjev(`/api/posudbe/${gumb.dataset.otkazi}/otkazi`, { method: 'PUT' });
                        prikaziToast(odgovor.poruka, 'uspjeh');
                        await ucitajPosudbe();
                    } catch (greska) {
                        prikaziToast(greska.message, 'greska');
                        gumb.disabled = false;
                    }
                });
            });
        }

        // --- povijest (vraceno / otkazano) ---
        if (povijest.length === 0) {
            povijestTijelo.innerHTML =
                '<tr><td colspan="4" class="tablica-prazno">Još nema završenih posudbi.</td></tr>';
        } else {
            povijestTijelo.innerHTML = povijest.map((p) => {
                const zavrseno = p.status === 'vraceno' ? formatirajDatum(p.datum_vracanja) : '—';
                return `<tr>
                    <td>${celijaIgre(p)}</td>
                    <td>${oznakaStatusa(p.status)}</td>
                    <td>${formatirajDatum(p.datum_rezervacije)}</td>
                    <td>${zavrseno}</td>
                </tr>`;
            }).join('');
        }
    } catch (greska) {
        const poruka = `<tr><td colspan="4" class="tablica-prazno">${pobjegniHTML(greska.message)}</td></tr>`;
        aktivneTijelo.innerHTML = poruka;
        povijestTijelo.innerHTML = poruka;
    }
}

// Dohvat i prikaz omiljenih igara
async function ucitajOmiljeneIgre() {
    const spremnik = document.getElementById('omiljene-igre');
    try {
        const igre = await apiZahtjev('/api/omiljene/moje');
        if (igre.length === 0) {
            spremnik.innerHTML = `<div class="ucitavanje">Još nemate omiljenih igara. Označite ih srcem u <a href="igre.html">katalogu</a>.</div>`;
            return;
        }
        spremnik.innerHTML = igre.map(karticaIgreHTML).join('');
        postaviSlusaceSrca(spremnik, ucitajOmiljeneIgre); // ukloni karticu odmah nakon micanja iz omiljenih
    } catch (greska) {
        spremnik.innerHTML = `<div class="ucitavanje">${pobjegniHTML(greska.message)}</div>`;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await korisnikUcitan;
    if (!prijavljeniKorisnik) {
        location.href = 'prijava.html';
        return;
    }
    prikaziProfil();
    await Promise.all([ucitajPosudbe(), ucitajOmiljeneIgre()]);
});
