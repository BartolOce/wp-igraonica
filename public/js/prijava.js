// =====================================================
// prijava.js - obrazac za prijavu s validacijom
// =====================================================

document.addEventListener('DOMContentLoaded', async () => {
    // vec prijavljeni korisnik nema sto traziti na ovoj stranici
    await korisnikUcitan;
    if (prijavljeniKorisnik) {
        location.href = 'profil.html';
        return;
    }

    // poruka nakon uspjesne registracije (?registracija=ok)
    if (new URLSearchParams(location.search).get('registracija') === 'ok') {
        document.getElementById('poruka-registracija').classList.add('vidljiva');
    }

    const forma = document.getElementById('forma-prijava');
    const emailUnos = document.getElementById('email');
    const lozinkaUnos = document.getElementById('lozinka');
    const porukaGreska = document.getElementById('poruka-greska');

    // validacija pojedinog polja odmah pri napustanju polja
    emailUnos.addEventListener('blur', () => provjeriPolje(emailUnos, Validacija.email));
    lozinkaUnos.addEventListener('blur', () =>
        provjeriPolje(lozinkaUnos, (v) => Validacija.obavezno(v, 'Unesite lozinku.')));

    forma.addEventListener('submit', async (dogadaj) => {
        dogadaj.preventDefault();
        porukaGreska.classList.remove('vidljiva');

        // validacija na klijentskoj strani prije slanja
        const emailIspravan = provjeriPolje(emailUnos, Validacija.email);
        const lozinkaIspravna = provjeriPolje(lozinkaUnos, (v) => Validacija.obavezno(v, 'Unesite lozinku.'));
        if (!emailIspravan || !lozinkaIspravna) return;

        const gumb = document.getElementById('gumb-prijava');
        gumb.disabled = true;
        gumb.textContent = 'Prijava...';

        try {
            const odgovor = await apiZahtjev('/api/auth/prijava', {
                method: 'POST',
                body: {
                    email: emailUnos.value.trim(),
                    lozinka: lozinkaUnos.value
                }
            });
            prijavljeniKorisnik = odgovor.korisnik;
            prikaziToast(odgovor.poruka, 'uspjeh');
            // admina vodi na administraciju, ostale na naslovnicu
            const odrediste = odgovor.korisnik.uloga === 'admin' ? 'admin.html' : 'index.html';
            // zastavica: naslovnica nakon preusmjeravanja prikazuje upozorenje o kasnjenju
            sessionStorage.setItem('najavaZakasnjenja', '1');
            setTimeout(() => { location.href = odrediste; }, 700);
        } catch (greska) {
            porukaGreska.textContent = greska.message;
            porukaGreska.classList.add('vidljiva');
            gumb.disabled = false;
            gumb.textContent = 'Prijavi se';
        }
    });
});
