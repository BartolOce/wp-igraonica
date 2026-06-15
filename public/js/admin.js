// =====================================================
// admin.js - nadzorna ploča i upravljanje posudbama
// (potvrda preuzimanja i povrata - samo admin)
// =====================================================

// Dohvat i prikaz statistike na nadzornoj ploči
async function ucitajPlocu() {
    try {
        const s = await apiZahtjev('/api/admin/statistika');

        const kartice = [
            { broj: s.posudbe.rezervirano, naziv: 'rezervacija na čekanju' },
            { broj: s.posudbe.preuzeto, naziv: 'igara trenutno posuđeno' },
            { broj: s.brojIgara, naziv: 'igara u katalogu' },
            { broj: s.brojPrimjeraka, naziv: 'primjeraka ukupno' },
            { broj: s.brojClanova, naziv: 'učlanjenih članova' },
            { broj: s.brojRecenzija, naziv: 'objavljenih recenzija' }
        ];
        document.getElementById('stat-kartice').innerHTML = kartice.map((k) => `
            <div class="stat-kartica">
                <div class="stat-broj">${k.broj}</div>
                <div class="stat-naziv">${k.naziv}</div>
            </div>`).join('');

        // najtrazenije igre (ljestvica)
        const najt = document.getElementById('najtrazenije');
        najt.innerHTML = s.najtrazenije.length === 0
            ? '<li class="tablica-prazno" style="list-style:none;">Još nema posudbi.</li>'
            : s.najtrazenije.map((i) => `
                <li><span>${pobjegniHTML(i.naziv)}</span><span class="raspodjela-broj">${i.broj}×</span></li>`).join('');

        // raspodjela po kategoriji s trakama
        const maks = Math.max(...s.poKategoriji.map((k) => k.broj), 1);
        document.getElementById('po-kategoriji').innerHTML = s.poKategoriji.map((k) => `
            <li>
                <div class="raspodjela-vrh"><span>${pobjegniHTML(k.kategorija)}</span><span class="raspodjela-broj">${k.broj}</span></div>
                <div class="traka"><div class="traka-ispuna" style="width: ${Math.round(k.broj / maks * 100)}%"></div></div>
            </li>`).join('');
    } catch (greska) {
        document.getElementById('stat-kartice').innerHTML =
            `<div class="ucitavanje">${pobjegniHTML(greska.message)}</div>`;
    }
}

function celijaClana(p) {
    return `${pobjegniHTML(p.ime)} ${pobjegniHTML(p.prezime)}<br>
            <small style="color: var(--tinta-svijetla);">${pobjegniHTML(p.email)}</small>`;
}

// Broj punih dana od zadanog datuma do sada
function danaOd(datum) {
    return Math.floor((Date.now() - new Date(datum).getTime()) / 86400000);
}

const PRAG_CEKANJA_DANA = 3; // rezervacija starija od ovoga se ističe

// Dohvat svih posudbi i punjenje tablica (rezervacije + preuzete)
async function ucitajPosudbe() {
    const rezTijelo = document.getElementById('tablica-rezervacije');
    const preTijelo = document.getElementById('tablica-preuzete');
    try {
        const sve = await apiZahtjev('/api/posudbe');
        const rezervacije = sve.filter((p) => p.status === 'rezervirano');
        const preuzete = sve.filter((p) => p.status === 'preuzeto');

        // rezervacije -> gumb "Označi preuzeto"
        if (rezervacije.length === 0) {
            rezTijelo.innerHTML = '<tr><td colspan="4" class="tablica-prazno">Nema rezervacija na čekanju.</td></tr>';
        } else {
            rezTijelo.innerHTML = rezervacije.map((p) => {
                const dana = danaOd(p.datum_rezervacije);
                const staro = dana >= PRAG_CEKANJA_DANA;
                const oznaka = staro
                    ? ` <span class="znacka znacka-nedostupno">čeka ${dana} d.</span>`
                    : '';
                return `
                <tr class="${staro ? 'redak-istaknut' : ''}">
                    <td><a href="igra.html?id=${p.igra_id}">${pobjegniHTML(p.naziv)}</a></td>
                    <td>${celijaClana(p)}</td>
                    <td>${formatirajDatum(p.datum_rezervacije)}${oznaka}</td>
                    <td><button class="gumb gumb-mali" data-preuzmi="${p.id}">Označi preuzeto</button></td>
                </tr>`;
            }).join('');
            postaviAkciju(rezTijelo, 'preuzmi');
        }

        // preuzete -> gumb "Označi vraćeno"
        if (preuzete.length === 0) {
            preTijelo.innerHTML = '<tr><td colspan="4" class="tablica-prazno">Nema posuđenih igara.</td></tr>';
        } else {
            preTijelo.innerHTML = preuzete.map((p) => `
                <tr>
                    <td><a href="igra.html?id=${p.igra_id}">${pobjegniHTML(p.naziv)}</a></td>
                    <td>${celijaClana(p)}</td>
                    <td>${formatirajDatum(p.rok_vracanja)}</td>
                    <td><button class="gumb gumb-mali gumb-sekundarni" data-vrati="${p.id}">Označi vraćeno</button></td>
                </tr>`).join('');
            postaviAkciju(preTijelo, 'vrati');
        }
    } catch (greska) {
        const poruka = `<tr><td colspan="4" class="tablica-prazno">${pobjegniHTML(greska.message)}</td></tr>`;
        rezTijelo.innerHTML = poruka;
        preTijelo.innerHTML = poruka;
    }
}

// Ozici gumbe akcije (preuzmi / vrati) i osvjezi plocu i tablice
function postaviAkciju(spremnik, akcija) {
    spremnik.querySelectorAll(`[data-${akcija}]`).forEach((gumb) => {
        gumb.addEventListener('click', async () => {
            gumb.disabled = true;
            try {
                const id = gumb.dataset[akcija];
                const odgovor = await apiZahtjev(`/api/posudbe/${id}/${akcija}`, { method: 'PUT' });
                prikaziToast(odgovor.poruka, 'uspjeh');
                await Promise.all([ucitajPosudbe(), ucitajPlocu()]);
            } catch (greska) {
                prikaziToast(greska.message, 'greska');
                gumb.disabled = false;
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    await korisnikUcitan;
    // pristup ima samo administrator
    if (!prijavljeniKorisnik || prijavljeniKorisnik.uloga !== 'admin') {
        location.href = prijavljeniKorisnik ? 'index.html' : 'prijava.html';
        return;
    }
    await Promise.all([ucitajPlocu(), ucitajPosudbe()]);
});
