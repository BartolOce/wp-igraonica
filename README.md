# Igraonica 🎲

Web aplikacija posudionice društvenih igara — projektni zadatak iz web programiranja.

Aplikacija omogućuje pregled i pretragu kataloga društvenih igara, registraciju i prijavu
korisnika, posudbu i vraćanje igara, pisanje recenzija s ocjenama te
administraciju kataloga (dodavanje, uređivanje i brisanje igara).

## Sadržaj

- [Korištene tehnologije](#korištene-tehnologije)
- [Pokretanje aplikacije](#pokretanje-aplikacije)
- [Probni računi i početni podaci](#probni-računi-i-početni-podaci)
- [Kako su ispunjeni zahtjevi zadatka](#kako-su-ispunjeni-zahtjevi-zadatka)
- [Struktura projekta](#struktura-projekta)
- [Struktura baze podataka](#struktura-baze-podataka)
- [REST API](#rest-api-vlastiti-json)

## Korištene tehnologije

| Sloj | Tehnologija |
|---|---|
| Front-end | HTML5, vlastiti CSS (Flexbox + Grid, responzivno), čisti JavaScript (fetch/AJAX) |
| Back-end | Node.js + Express (vlastiti REST API, JSON) |
| Baza podataka | MySQL / MariaDB (XAMPP), 6 tablica |
| Sigurnost | bcryptjs (hashiranje lozinki), express-session (sesije), pripremljeni SQL upiti |

## Pokretanje aplikacije

**Preduvjeti:** Node.js (v18+) i XAMPP. Potrebne pakete projekt već sadrži (mapa `node_modules`), pa `npm install` **nije** potreban.

Pokretanje je u tri koraka:

1. U **XAMPP Control Panelu** pokreni **MySQL**.
2. Dvoklik na **`postavi-bazu.bat`** — stvara bazu `igraonica` sa 6 tablica i početnim podacima. *(Pokreće se jednom; traži potvrdu jer **briše i iznova gradi** bazu — uvijek čisto, ponovljivo stanje.)*
3. Dvoklik na **`pokreni.bat`** — pokreće poslužitelj. Zatim otvori **http://localhost:3000**.

> Isto se može i iz terminala: `npm run init-baza` (korak 2), pa `npm start` (korak 3).

### Postavke veze (`config.js`)

Zadane postavke odgovaraju XAMPP-u; promijeni ih samo ako tvoj MySQL koristi lozinku ili drugi port.

| Postavka | Vrijednost |
|---|---|
| host | `localhost` |
| port | `3306` |
| korisnik | `root` |
| lozinka | *(prazno)* |
| baza | `igraonica` |
| kodiranje | `utf8mb4` (collation `utf8mb4_croatian_ci`) |

## Probni računi i početni podaci

`postavi-bazu.bat` puni bazu demo podacima osmišljenima tako da se **odmah mogu prikazati sve funkcionalnosti**:

- **36 društvenih igara** u katalogu
- **4 korisnika** (1 administrator + 3 člana)
- **15 posudbi** u svim stanjima (rezervirano, preuzeto, vraćeno, otkazano) — uključujući jednu **zakašnjelu** posudbu i dvije **potpuno zauzete (nedostupne)** igre
- **9 recenzija** (Catan ima 3, Dixit 2) te nekoliko **omiljenih** igara po članu

### Probni korisnički računi

| Uloga | E-mail | Lozinka | Što ima pripremljeno za demonstraciju |
|---|---|---|---|
| **Administrator** | `admin@igraonica.hr` | `admin123` | nadzorna ploča, upravljanje posudbama i katalogom |
| Član | `ana.anic@gmail.com` | `lozinka123` | aktivna posudba (rok pred istek), rezervacija, recenzije, omiljene |
| Član | `marko.maric@gmail.com` | `lozinka123` | **zakašnjela** posudba (Gloomhaven) → upozorenje pri prijavi + blokada nove rezervacije |
| Član | `ivana.kovac@gmail.com` | `lozinka123` | preuzeta igra, rezervacija, recenzije, omiljene |

> **Administrator se ne može registrirati** kroz aplikaciju (registracija uvijek stvara običnog člana) — za administraciju koristi gornji račun. Sva tri člana dijele lozinku `lozinka123`.

## Kako su ispunjeni zahtjevi zadatka

- **Bez CMS-a** — sav kod je pisan ručno (Express + čisti front-end).
- **HTML, CSS, JavaScript** — 9 HTML stranica, vlastiti CSS, sva logika u čistom JavaScriptu.
- **Poslužiteljski dio** — Node.js + Express s vlastitim REST API-jem.
- **Baza podataka** — lokalna MySQL baza (XAMPP) sa 6 povezanih tablica.
- **Responzivni dizajn** — Flexbox, Grid i media upiti (mobilni hamburger izbornik).
- **Dinamička navigacija** — izbornik se mijenja ovisno o prijavi i ulozi korisnika.
- **Dinamički sadržaj** — statistika, katalog, detalji igre, recenzije i posudbe grade se JavaScriptom iz API odgovora.
- **Rukovanje podacima na klijentu** — pretraga, filtriranje po kategoriji, broju igrača, težini i dostupnosti te sortiranje kataloga odvijaju se u pregledniku, bez ponovnog učitavanja.
- **Validacija na klijentskoj strani** — registracija, prijava, recenzije i obrazac igre (uz ponovnu provjeru na poslužitelju).
- **AJAX + JSON** — sva komunikacija s API-jem ide fetch funkcijom u JSON obliku.
- **Obrasci prijave i registracije** — s validacijom, hashiranjem lozinki i sesijama.
- **Realan tijek posudbe** — rezervacija korisnika te admin potvrda preuzimanja i povrata, uz nadzornu ploču.
- **Dodatno** — omiljene igre (wishlist), recenzije samo nakon posudbe, dinamična naslovnica s karuselima, galerija slika po igri (naslovna + dodatne, dodaju se uploadom ili URL-om), obavijesti o isteku roka i isticanje starih rezervacija.
- **Literatura** — samostalna stranica `literatura.html` dostupna iz podnožja.

## Struktura projekta

```
Web_projekt/
├── server.js              # Express poslužitelj + API statistike
├── config.js              # postavke (port, baza, sesija)
├── db.js                  # MySQL pool veza
├── setup/init-baza.js     # stvaranje baze, tablica i početnih podataka
├── middleware/autorizacija.js
├── routes/                # API rute (auth, igre, posudbe, recenzije, omiljene)
└── public/                # front-end
    ├── *.html             # 9 stranica (uklj. admin.html i admin-katalog.html)
    ├── css/stil.css       # vlastiti responzivni CSS (vintage/retro tema)
    ├── slike/<naziv>/     # slike igara (mapa po imenu igre); ako nema slike, prikazuje se ilustracija
    └── js/                # klijentske skripte (AJAX, validacija, prikaz)
        └── ilustracije.js # generator SVG ilustracija "kutija" po kategoriji
```

## Struktura baze podataka

Baza `igraonica` (MySQL / MariaDB, kodiranje `utf8mb4`, collation `utf8mb4_croatian_ci`, mehanizam `InnoDB`)
sastoji se od **6 povezanih tablica**. Dvije glavne tablice (`korisnici` i `igre`) povezane su
preko veznih tablica (`posudbe`, `recenzije`, `omiljene`) koje opisuju odnose između korisnika i igara,
dok tablica `slike` drži dodatne slike galerije za svaku igru.

### Tablica `korisnici`

Registrirani korisnici aplikacije (članovi i administratori). Iz nje se provjerava prijava i određuju ovlasti.

| Stupac | Tip | Opis |
|---|---|---|
| `id` | INT, PK, AUTO_INCREMENT | jedinstveni identifikator korisnika |
| `ime` | VARCHAR(50), NOT NULL | ime korisnika |
| `prezime` | VARCHAR(50), NOT NULL | prezime korisnika |
| `email` | VARCHAR(100), NOT NULL, **UNIQUE** | e-mail; služi za prijavu, mora biti jedinstven |
| `lozinka` | VARCHAR(255), NOT NULL | lozinka spremljena kao **bcrypt hash** (nikad u čitljivom obliku) |
| `uloga` | ENUM('korisnik','admin'), DEFAULT 'korisnik' | razina ovlasti; `admin` ima pristup administraciji |
| `datum_registracije` | DATETIME, DEFAULT CURRENT_TIMESTAMP | trenutak otvaranja računa |

### Tablica `igre`

Katalog društvenih igara — središnja tablica sadržaja. Svaki redak je jedan naslov igre.

| Stupac | Tip | Opis |
|---|---|---|
| `id` | INT, PK, AUTO_INCREMENT | jedinstveni identifikator igre |
| `naziv` | VARCHAR(200), NOT NULL | naziv igre |
| `izdavac` | VARCHAR(100), NOT NULL | izdavač igre |
| `kategorija` | VARCHAR(50), NOT NULL | kategorija/žanr (Strateška, Obiteljska, Zabavna, …) |
| `godina` | SMALLINT | godina izdanja |
| `min_igraca` | TINYINT, DEFAULT 1 | najmanji broj igrača |
| `max_igraca` | TINYINT, DEFAULT 4 | najveći broj igrača |
| `trajanje` | SMALLINT, DEFAULT 30 | prosječno trajanje partije (u minutama) |
| `tezina` | ENUM('lagana','srednja','teška'), DEFAULT 'srednja' | složenost igre |
| `opis` | TEXT | kratki opis igre |
| `broj_primjeraka` | INT, DEFAULT 1 | koliko primjeraka igraonica posjeduje (osnova za izračun dostupnosti) |
| `slika_url` | VARCHAR(500), NULL | naslovna (cover) slika; prikazuje se u katalogu. Ako je `NULL`, prikazuje se generirana SVG ilustracija |

### Tablica `posudbe`

Vezna tablica korisnik ↔ igra koja bilježi cijeli životni ciklus posudbe. Jedan redak prati jednu posudbu kroz njezina stanja.

| Stupac | Tip | Opis |
|---|---|---|
| `id` | INT, PK, AUTO_INCREMENT | identifikator posudbe |
| `korisnik_id` | INT, NOT NULL, **FK → `korisnici(id)`** | tko je posudio igru |
| `igra_id` | INT, NOT NULL, **FK → `igre(id)`** | koja je igra posuđena |
| `status` | ENUM('rezervirano','preuzeto','vraceno','otkazano'), DEFAULT 'rezervirano' | trenutno stanje u tijeku posudbe |
| `datum_rezervacije` | DATETIME, DEFAULT CURRENT_TIMESTAMP | kada je korisnik rezervirao igru |
| `datum_preuzimanja` | DATETIME, NULL | kada je administrator potvrdio preuzimanje |
| `rok_vracanja` | DATE, NULL | rok do kojeg igru treba vratiti (preuzimanje + 14 dana) |
| `datum_vracanja` | DATETIME, NULL | kada je igra stvarno vraćena |

> Stanja `rezervirano` i `preuzeto` smatraju se **aktivnima** te zauzimaju primjerak igre pri izračunu dostupnosti.

### Tablica `recenzije`

Ocjene i komentari koje članovi ostavljaju igrama. Vezna tablica korisnik ↔ igra.

| Stupac | Tip | Opis |
|---|---|---|
| `id` | INT, PK, AUTO_INCREMENT | identifikator recenzije |
| `korisnik_id` | INT, NOT NULL, **FK → `korisnici(id)`** | autor recenzije |
| `igra_id` | INT, NOT NULL, **FK → `igre(id)`** | recenzirana igra |
| `ocjena` | TINYINT, NOT NULL, **CHECK (1–5)** | ocjena od 1 do 5 zvjezdica |
| `komentar` | TEXT | tekst recenzije |
| `datum` | DATETIME, DEFAULT CURRENT_TIMESTAMP | kada je recenzija napisana |

> Ograničenje **UNIQUE(`korisnik_id`, `igra_id`)** sprječava da isti korisnik dvaput recenzira istu igru.

### Tablica `omiljene`

Popis omiljenih igara (wishlist) svakog korisnika. Vezna tablica korisnik ↔ igra.

| Stupac | Tip | Opis |
|---|---|---|
| `id` | INT, PK, AUTO_INCREMENT | identifikator zapisa |
| `korisnik_id` | INT, NOT NULL, **FK → `korisnici(id)`** | vlasnik popisa |
| `igra_id` | INT, NOT NULL, **FK → `igre(id)`** | igra označena kao omiljena |
| `datum` | DATETIME, DEFAULT CURRENT_TIMESTAMP | kada je igra dodana u omiljene |

> Ograničenje **UNIQUE(`korisnik_id`, `igra_id`)** osigurava da je igra najviše jednom na popisu.

### Tablica `slike`

Dodatne slike galerije pojedine igre. Naslovna slika nalazi se u `igre.slika_url`, a ovdje su ostale slike koje se vide u galeriji na stranici igre.

| Stupac | Tip | Opis |
|---|---|---|
| `id` | INT, PK, AUTO_INCREMENT | identifikator slike |
| `igra_id` | INT, NOT NULL, **FK → `igre(id)`** | igra kojoj slika pripada |
| `putanja` | VARCHAR(500), NOT NULL | putanja do slike (`/slike/<naziv>/…`) ili vanjski URL |

> Slike se prikazuju poredane redoslijedom dodavanja; prva u nizu (zajedno s naslovnom) čini galeriju.

### Veze među tablicama

- `korisnici` (1) — (∞) `posudbe`, `recenzije`, `omiljene`
- `igre` (1) — (∞) `posudbe`, `recenzije`, `omiljene`, `slike`
- Svi strani ključevi koriste **`ON DELETE CASCADE`**: brisanjem korisnika ili igre automatski se brišu i sve pripadajuće posudbe, recenzije, oznake omiljenih i slike (nema „visećih" zapisa).

Katalog dolazi s 36 društvenih igara. Slike igara rješavaju se **hibridno**: ako igra ima slike, prva (naslovna) prikazuje se u katalogu, a sve se mogu listati u galeriji na stranici igre; ako igra nema nijednu sliku, prikazuje se generirana SVG ilustracija prema kategoriji (radi offline, bez autorskih prava). Slike se u administraciji dodaju **učitavanjem datoteke ili upisom URL-a**, a spremaju se u mapu nazvanu po imenu igre (npr. `public/slike/catan/`). Slike se mogu i **ručno ubaciti u tu mapu** te se automatski prikazuju (poredane po nazivu datoteke; prva je naslovna).

### Tijek posudbe (stanja)

Posudba prolazi kroz stanja: **rezervirano → preuzeto → vraceno** (ili **otkazano**).
Korisnik stvara rezervaciju i može je otkazati dok je ne preuzme. Administrator na svojoj
nadzornoj ploči potvrđuje **preuzimanje** (tada počinje rok od 14 dana) i kasnije **povrat**.
Rezervirani i preuzeti primjerci smatraju se zauzetima pri izračunu dostupnosti.

## REST API (vlastiti, JSON)

Rute su grupirane po HTTP metodi. Prefiks određuje resurs: `/api/auth` (autentikacija), `/api/igre` (katalog), `/api/posudbe`, `/api/recenzije`, `/api/omiljene`, `/api/admin`.

### GET — dohvat podataka

| Ruta | Opis | Pristup |
|---|---|---|
| `GET /api/auth/ja` | trenutna sesija | svi |
| `GET /api/igre` | popis igara (+ dostupnost, prosječna ocjena) | svi |
| `GET /api/igre/kategorije` | popis kategorija | svi |
| `GET /api/igre/:id` | detalji igre | svi |
| `GET /api/posudbe/moje` | posudbe prijavljenog korisnika | prijavljeni |
| `GET /api/posudbe` | sve posudbe (upravljanje) | admin |
| `GET /api/recenzije/igra/:id` | recenzije igre | svi |
| `GET /api/omiljene/moje` | omiljene igre korisnika (detalji) | prijavljeni |
| `GET /api/omiljene/ids` | id-evi omiljenih igara | prijavljeni |
| `GET /api/admin/statistika` | brojke za nadzornu ploču | admin |

### POST — stvaranje

| Ruta | Opis | Pristup |
|---|---|---|
| `POST /api/auth/registracija` | registracija korisnika | svi |
| `POST /api/auth/prijava` | prijava | svi |
| `POST /api/auth/odjava` | odjava | prijavljeni |
| `POST /api/igre` | dodavanje igre | admin |
| `POST /api/posudbe` | rezervacija igre | prijavljeni |
| `POST /api/recenzije` | nova recenzija (samo nakon posudbe) | prijavljeni |
| `POST /api/omiljene` | dodavanje u omiljene | prijavljeni |

### PUT — izmjena

| Ruta | Opis | Pristup |
|---|---|---|
| `PUT /api/igre/:id` | uređivanje igre | admin |
| `PUT /api/posudbe/:id/otkazi` | otkazivanje vlastite rezervacije | prijavljeni |
| `PUT /api/posudbe/:id/preuzmi` | potvrda preuzimanja | admin |
| `PUT /api/posudbe/:id/vrati` | potvrda povrata | admin |
| `PUT /api/posudbe/:id/admin-otkazi` | otkazivanje tuđe rezervacije | admin |

### DELETE — brisanje

| Ruta | Opis | Pristup |
|---|---|---|
| `DELETE /api/igre/:id` | brisanje igre | admin |
| `DELETE /api/recenzije/:id` | brisanje recenzije | autor / admin |
| `DELETE /api/omiljene/:igraId` | uklanjanje iz omiljenih | prijavljeni |
