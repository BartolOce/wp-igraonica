# Igraonica 🎲

Web aplikacija posudionice društvenih igara — projektni zadatak iz web programiranja.

Aplikacija omogućuje pregled i pretragu kataloga društvenih igara, registraciju i prijavu
korisnika, posudbu i vraćanje igara, pisanje recenzija s ocjenama te
administraciju kataloga (dodavanje, uređivanje i brisanje igara).

## Korištene tehnologije

| Sloj | Tehnologija |
|---|---|
| Front-end | HTML5, vlastiti CSS (Flexbox + Grid, responzivno), čisti JavaScript (fetch/AJAX) |
| Back-end | Node.js + Express (vlastiti REST API, JSON) |
| Baza podataka | MySQL / MariaDB (XAMPP), 5 tablica |
| Sigurnost | bcryptjs (hashiranje lozinki), express-session (sesije), pripremljeni SQL upiti |

## Pokretanje aplikacije

Potrebno: **Node.js** (v18+) i **XAMPP** (MySQL).

1. U XAMPP Control Panelu pokrenuti **MySQL** (zadane postavke: port 3306, korisnik `root` bez lozinke — po potrebi izmijeniti u `config.js`).
2. U mapi projekta instalirati pakete:
   ```
   npm install
   ```
3. Stvoriti bazu podataka s početnim podacima:
   ```
   npm run init-baza
   ```
4. Pokrenuti poslužitelj:
   ```
   npm start
   ```
5. Otvoriti u pregledniku: **http://localhost:3000**

## Probni korisnički računi

| Uloga | E-mail | Lozinka |
|---|---|---|
| Administrator | `admin@igraonica.hr` | `admin123` |
| Korisnik | `ana.anic@gmail.com` | `lozinka123` |

## Struktura baze podataka

Baza `igraonica` (MySQL / MariaDB, kodiranje `utf8mb4`, collation `utf8mb4_croatian_ci`, mehanizam `InnoDB`)
sastoji se od **5 povezanih tablica**. Dvije glavne tablice (`korisnici` i `igre`) povezane su
preko tri vezne tablice (`posudbe`, `recenzije`, `omiljene`) koje opisuju odnose između korisnika i igara.

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
| `slika_url` | VARCHAR(500), NULL | poveznica na sliku; ako je `NULL`, prikazuje se generirana SVG ilustracija |

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

### Veze među tablicama

- `korisnici` (1) — (∞) `posudbe`, `recenzije`, `omiljene`
- `igre` (1) — (∞) `posudbe`, `recenzije`, `omiljene`
- Svi strani ključevi koriste **`ON DELETE CASCADE`**: brisanjem korisnika ili igre automatski se brišu i sve pripadajuće posudbe, recenzije i oznake omiljenih (nema „visećih" zapisa).

Katalog dolazi s 36 društvenih igara. Slike igara rješavaju se **hibridno**: ako igra ima `slika_url`, prikazuje se prava slika; ako nema, prikazuje se generirana SVG ilustracija prema kategoriji (radi offline, bez autorskih prava).

### Tijek posudbe (stanja)

Posudba prolazi kroz stanja: **rezervirano → preuzeto → vraceno** (ili **otkazano**).
Korisnik stvara rezervaciju i može je otkazati dok je ne preuzme. Administrator na svojoj
nadzornoj ploči potvrđuje **preuzimanje** (tada počinje rok od 14 dana) i kasnije **povrat**.
Rezervirani i preuzeti primjerci smatraju se zauzetima pri izračunu dostupnosti.

## REST API (vlastiti, JSON)

| Metoda i ruta | Opis | Pristup |
|---|---|---|
| `POST /api/auth/registracija` | registracija korisnika | svi |
| `POST /api/auth/prijava` | prijava | svi |
| `POST /api/auth/odjava` | odjava | prijavljeni |
| `GET /api/auth/ja` | trenutna sesija | svi |
| `GET /api/igre` | popis igara (+ dostupnost, prosječna ocjena) | svi |
| `GET /api/igre/kategorije` | popis kategorija | svi |
| `GET /api/igre/:id` | detalji igre | svi |
| `POST /api/igre` | dodavanje igre | admin |
| `PUT /api/igre/:id` | uređivanje igre | admin |
| `DELETE /api/igre/:id` | brisanje igre | admin |
| `GET /api/posudbe/moje` | posudbe prijavljenog korisnika | prijavljeni |
| `POST /api/posudbe` | rezervacija igre | prijavljeni |
| `PUT /api/posudbe/:id/otkazi` | otkazivanje vlastite rezervacije | prijavljeni |
| `GET /api/posudbe` | sve posudbe (upravljanje) | admin |
| `PUT /api/posudbe/:id/preuzmi` | potvrda preuzimanja | admin |
| `PUT /api/posudbe/:id/vrati` | potvrda povrata | admin |
| `GET /api/recenzije/igra/:id` | recenzije igre | svi |
| `POST /api/recenzije` | nova recenzija (samo nakon posudbe) | prijavljeni |
| `DELETE /api/recenzije/:id` | brisanje recenzije | autor / admin |
| `GET /api/omiljene/moje` · `/ids` | omiljene igre korisnika | prijavljeni |
| `POST /api/omiljene` · `DELETE /api/omiljene/:igraId` | dodavanje/uklanjanje omiljene | prijavljeni |
| `GET /api/admin/statistika` | brojke za nadzornu ploču | admin |

## Kako su ispunjeni zahtjevi zadatka

- **Bez CMS-a** — sav kod je pisan ručno (Express + čisti front-end).
- **HTML, CSS, JavaScript** — 9 HTML stranica, vlastiti CSS, sva logika u čistom JavaScriptu.
- **Poslužiteljski dio** — Node.js + Express s vlastitim REST API-jem.
- **Baza podataka** — lokalna MySQL baza (XAMPP) s 5 povezanih tablica.
- **Responzivni dizajn** — Flexbox, Grid i media upiti (mobilni hamburger izbornik).
- **Dinamička navigacija** — izbornik se mijenja ovisno o prijavi i ulozi korisnika.
- **Dinamički sadržaj** — statistika, katalog, detalji igre, recenzije i posudbe grade se JavaScriptom iz API odgovora.
- **Rukovanje podacima na klijentu** — pretraga, filtriranje po kategoriji, broju igrača, težini i dostupnosti te sortiranje kataloga odvijaju se u pregledniku, bez ponovnog učitavanja.
- **Validacija na klijentskoj strani** — registracija, prijava, recenzije i obrazac igre (uz ponovnu provjeru na poslužitelju).
- **AJAX + JSON** — sva komunikacija s API-jem ide fetch funkcijom u JSON obliku.
- **Obrasci prijave i registracije** — s validacijom, hashiranjem lozinki i sesijama.
- **Realan tijek posudbe** — rezervacija korisnika te admin potvrda preuzimanja i povrata, uz nadzornu ploču.
- **Dodatno** — omiljene igre (wishlist), recenzije samo nakon posudbe, dinamična naslovnica s karuselima, galerija slika po igri, obavijesti o isteku roka i isticanje starih rezervacija.
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
    └── js/                # klijentske skripte (AJAX, validacija, prikaz)
        └── ilustracije.js # generator SVG ilustracija "kutija" po kategoriji
```
