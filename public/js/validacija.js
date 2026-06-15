// =====================================================
// validacija.js - validacija korisnickih podataka
// na klijentskoj strani (prije slanja na posluzitelj)
// =====================================================

// Pravila validacije - svaka funkcija vraca poruku greske ili prazan string
const Validacija = {
    ime(vrijednost, naziv = 'Ime') {
        if (!vrijednost || vrijednost.trim().length < 2) {
            return `${naziv} mora imati najmanje 2 znaka.`;
        }
        if (!/^[a-zA-ZčćžšđČĆŽŠĐ\s-]+$/.test(vrijednost.trim())) {
            return `${naziv} smije sadržavati samo slova.`;
        }
        return '';
    },

    email(vrijednost) {
        const uzorak = /^[\w.+-]+@[\w-]+\.[\w.]{2,}$/;
        if (!vrijednost || !uzorak.test(vrijednost.trim())) {
            return 'Unesite ispravnu e-mail adresu (npr. ime@domena.hr).';
        }
        return '';
    },

    lozinka(vrijednost) {
        if (!vrijednost || vrijednost.length < 8) {
            return 'Lozinka mora imati najmanje 8 znakova.';
        }
        if (!/[a-zA-Z]/.test(vrijednost) || !/\d/.test(vrijednost)) {
            return 'Lozinka mora sadržavati barem jedno slovo i jednu znamenku.';
        }
        return '';
    },

    potvrdaLozinke(lozinka, potvrda) {
        if (lozinka !== potvrda) {
            return 'Lozinke se ne podudaraju.';
        }
        return '';
    },

    obavezno(vrijednost, poruka = 'Ovo polje je obvezno.') {
        if (!vrijednost || String(vrijednost).trim() === '') {
            return poruka;
        }
        return '';
    },

    broj(vrijednost, min, max, naziv = 'Vrijednost') {
        const broj = Number(vrijednost);
        if (!Number.isInteger(broj) || broj < min || broj > max) {
            return `${naziv} mora biti cijeli broj između ${min} i ${max}.`;
        }
        return '';
    },

    minDuljina(vrijednost, min, naziv = 'Tekst') {
        if (!vrijednost || vrijednost.trim().length < min) {
            return `${naziv} mora imati najmanje ${min} znakova.`;
        }
        return '';
    }
};

// Prikaz greske ispod polja obrasca (polje mora biti unutar .polje elementa
// koji sadrzi .greska-poruka element)
function postaviGresku(input, poruka) {
    const polje = input.closest('.polje');
    if (!polje) return;
    const porukaEl = polje.querySelector('.greska-poruka');
    if (poruka) {
        polje.classList.add('neispravno');
        if (porukaEl) porukaEl.textContent = poruka;
    } else {
        polje.classList.remove('neispravno');
        if (porukaEl) porukaEl.textContent = '';
    }
}

// Provjerava jedno polje pomocu zadane funkcije i prikazuje gresku.
// Vraca true ako je polje ispravno.
function provjeriPolje(input, funkcijaProvjere) {
    const poruka = funkcijaProvjere(input.value);
    postaviGresku(input, poruka);
    return poruka === '';
}

// Prikaz gresaka koje je vratio posluzitelj (objekt { imePolja: poruka })
function prikaziGreskePosluzitelja(obrazac, polja) {
    if (!polja) return;
    Object.entries(polja).forEach(([ime, poruka]) => {
        const input = obrazac.querySelector(`[name="${ime}"]`);
        if (input) postaviGresku(input, poruka);
    });
}
