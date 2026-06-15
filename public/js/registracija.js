// =====================================================
// registracija.js - obrazac za registraciju
// s validacijom u stvarnom vremenu
// =====================================================

document.addEventListener('DOMContentLoaded', async () => {
    await korisnikUcitan;
    if (prijavljeniKorisnik) {
        location.href = 'profil.html';
        return;
    }

    const forma = document.getElementById('forma-registracija');
    const polja = {
        ime: document.getElementById('ime'),
        prezime: document.getElementById('prezime'),
        email: document.getElementById('email'),
        lozinka: document.getElementById('lozinka'),
        potvrda: document.getElementById('potvrda-lozinke')
    };
    const porukaGreska = document.getElementById('poruka-greska');

    // pravila validacije za svako polje
    const pravila = {
        ime: (v) => Validacija.ime(v, 'Ime'),
        prezime: (v) => Validacija.ime(v, 'Prezime'),
        email: Validacija.email,
        lozinka: Validacija.lozinka,
        potvrda: (v) => Validacija.potvrdaLozinke(polja.lozinka.value, v)
    };

    // validacija u stvarnom vremenu: pri napustanju polja (blur)
    // i pri svakom upisu ako je polje vec oznaceno kao neispravno
    Object.entries(polja).forEach(([naziv, input]) => {
        input.addEventListener('blur', () => provjeriPolje(input, pravila[naziv]));
        input.addEventListener('input', () => {
            if (input.closest('.polje').classList.contains('neispravno')) {
                provjeriPolje(input, pravila[naziv]);
            }
        });
    });

    forma.addEventListener('submit', async (dogadaj) => {
        dogadaj.preventDefault();
        porukaGreska.classList.remove('vidljiva');

        // provjera svih polja prije slanja na posluzitelj
        let sveIspravno = true;
        Object.entries(polja).forEach(([naziv, input]) => {
            if (!provjeriPolje(input, pravila[naziv])) sveIspravno = false;
        });
        if (!sveIspravno) return;

        const gumb = document.getElementById('gumb-registracija');
        gumb.disabled = true;
        gumb.textContent = 'Registracija...';

        try {
            await apiZahtjev('/api/auth/registracija', {
                method: 'POST',
                body: {
                    ime: polja.ime.value.trim(),
                    prezime: polja.prezime.value.trim(),
                    email: polja.email.value.trim(),
                    lozinka: polja.lozinka.value
                }
            });
            // nakon registracije korisnika vodimo na prijavu
            location.href = 'prijava.html?registracija=ok';
        } catch (greska) {
            porukaGreska.textContent = greska.message;
            porukaGreska.classList.add('vidljiva');
            prikaziGreskePosluzitelja(forma, greska.polja);
            gumb.disabled = false;
            gumb.textContent = 'Registriraj se';
        }
    });
});
