// =====================================================
// init-baza.js - inicijalizacija baze podataka
// Stvara bazu "igraonica", sve tablice i ubacuje pocetne podatke.
// Pokretanje: npm run init-baza
// VAZNO: MySQL server (XAMPP) mora biti pokrenut!
// =====================================================

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Naziv igre -> "slug" za ime mape sa slikama (isto pravilo kao u routes/igre.js)
function nazivUSlug(naziv) {
    const bezKvacica = { 'č': 'c', 'ć': 'c', 'ž': 'z', 'š': 's', 'đ': 'd' };
    return String(naziv || '')
        .toLowerCase()
        .replace(/[čćžšđ]/g, (z) => bezKvacica[z])
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'igra';
}

async function glavna() {
    let veza;
    try {
        // Spajanje BEZ odabira baze (baza jos ne postoji)
        veza = await mysql.createConnection({
            host: config.baza.host,
            port: config.baza.port,
            user: config.baza.user,
            password: config.baza.password,
            charset: 'utf8mb4',
            multipleStatements: true
        });
        console.log('Spojen na MySQL server.');
    } catch (greska) {
        console.error('GRESKA: Nije moguce spojiti se na MySQL server!');
        console.error('Provjerite je li MySQL pokrenut u XAMPP Control Panelu.');
        console.error('Detalji:', greska.message);
        process.exit(1);
    }

    // 1) Stvaranje baze podataka
    await veza.query(`DROP DATABASE IF EXISTS ${config.baza.database}`);
    await veza.query(
        `CREATE DATABASE ${config.baza.database}
         CHARACTER SET utf8mb4 COLLATE utf8mb4_croatian_ci`
    );
    await veza.query(`USE ${config.baza.database}`);
    console.log(`Baza "${config.baza.database}" stvorena.`);

    // 2) Tablica korisnika
    await veza.query(`
        CREATE TABLE korisnici (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ime VARCHAR(50) NOT NULL,
            prezime VARCHAR(50) NOT NULL,
            email VARCHAR(100) NOT NULL UNIQUE,
            lozinka VARCHAR(255) NOT NULL,
            uloga ENUM('korisnik', 'admin') NOT NULL DEFAULT 'korisnik',
            datum_registracije DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB
    `);

    // 3) Tablica drustvenih igara
    await veza.query(`
        CREATE TABLE igre (
            id INT AUTO_INCREMENT PRIMARY KEY,
            naziv VARCHAR(200) NOT NULL,
            izdavac VARCHAR(100) NOT NULL,
            kategorija VARCHAR(50) NOT NULL,
            godina SMALLINT,
            min_igraca TINYINT NOT NULL DEFAULT 1,
            max_igraca TINYINT NOT NULL DEFAULT 4,
            trajanje SMALLINT NOT NULL DEFAULT 30,
            tezina ENUM('lagana', 'srednja', 'teška') NOT NULL DEFAULT 'srednja',
            opis TEXT,
            broj_primjeraka INT NOT NULL DEFAULT 1,
            slika_url VARCHAR(500) NULL
        ) ENGINE=InnoDB
    `);

    // 4) Tablica posudbi (veza korisnik <-> igra)
    // Tijek stanja: rezervirano -> preuzeto -> vraceno  (ili otkazano)
    //  - korisnik stvara rezervaciju
    //  - admin potvrdjuje preuzimanje (tada se postavlja rok_vracanja)
    //  - admin potvrdjuje povrat
    await veza.query(`
        CREATE TABLE posudbe (
            id INT AUTO_INCREMENT PRIMARY KEY,
            korisnik_id INT NOT NULL,
            igra_id INT NOT NULL,
            status ENUM('rezervirano', 'preuzeto', 'vraceno', 'otkazano') NOT NULL DEFAULT 'rezervirano',
            datum_rezervacije DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            datum_preuzimanja DATETIME NULL,
            rok_vracanja DATE NULL,
            datum_vracanja DATETIME NULL,
            FOREIGN KEY (korisnik_id) REFERENCES korisnici(id) ON DELETE CASCADE,
            FOREIGN KEY (igra_id) REFERENCES igre(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
    `);

    // 5) Tablica recenzija
    await veza.query(`
        CREATE TABLE recenzije (
            id INT AUTO_INCREMENT PRIMARY KEY,
            korisnik_id INT NOT NULL,
            igra_id INT NOT NULL,
            ocjena TINYINT NOT NULL CHECK (ocjena BETWEEN 1 AND 5),
            komentar TEXT,
            datum DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY jedna_recenzija_po_korisniku (korisnik_id, igra_id),
            FOREIGN KEY (korisnik_id) REFERENCES korisnici(id) ON DELETE CASCADE,
            FOREIGN KEY (igra_id) REFERENCES igre(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
    `);

    // 5b) Tablica omiljenih igara (wishlist) - veza korisnik <-> igra
    await veza.query(`
        CREATE TABLE omiljene (
            id INT AUTO_INCREMENT PRIMARY KEY,
            korisnik_id INT NOT NULL,
            igra_id INT NOT NULL,
            datum DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY jedna_oznaka_po_korisniku (korisnik_id, igra_id),
            FOREIGN KEY (korisnik_id) REFERENCES korisnici(id) ON DELETE CASCADE,
            FOREIGN KEY (igra_id) REFERENCES igre(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
    `);

    // 5c) Tablica dodatnih slika igre (galerija) - veza prema igri.
    //     Naslovna slika je u igre.slika_url, a ostale slike (za galeriju) su ovdje.
    await veza.query(`
        CREATE TABLE slike (
            id INT AUTO_INCREMENT PRIMARY KEY,
            igra_id INT NOT NULL,
            putanja VARCHAR(500) NOT NULL,
            FOREIGN KEY (igra_id) REFERENCES igre(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
    `);
    console.log('Tablice stvorene: korisnici, igre, posudbe, recenzije, omiljene, slike.');

    // 6) Pocetni korisnici (lozinke se spremaju kao bcrypt hash)
    //    1 administrator + 3 clana; svi clanovi dijele lozinku 'lozinka123' (radi lakseg testiranja)
    const adminLozinka = await bcrypt.hash('admin123', 10);
    const clanLozinka = await bcrypt.hash('lozinka123', 10);
    await veza.query(
        `INSERT INTO korisnici (ime, prezime, email, lozinka, uloga) VALUES
         ('Admin', 'Voditelj', 'admin@igraonica.hr', ?, 'admin'),
         ('Ana', 'Anić', 'ana.anic@gmail.com', ?, 'korisnik'),
         ('Marko', 'Marić', 'marko.maric@gmail.com', ?, 'korisnik'),
         ('Ivana', 'Kovač', 'ivana.kovac@gmail.com', ?, 'korisnik')`,
        [adminLozinka, clanLozinka, clanLozinka, clanLozinka]
    );
    console.log('Korisnici ubaceni: 1 administrator + 3 clana.');

    // 7) Pocetne drustvene igre
    // [naziv, izdavac, kategorija, godina, min_igraca, max_igraca, trajanje(min), tezina, opis, broj_primjeraka, slika_url]
    // slika_url je null -> u tom slucaju front-end prikazuje generiranu ilustraciju po kategoriji
    const igre = [
        ['Catan', 'Kosmos', 'Strateška', 1995, 3, 4, 75, 'srednja',
         'Klasik moderne društvene igre. Igrači grade naselja, gradove i ceste te trguju sirovinama kako bi prvi skupili 10 bodova na otoku Catanu. Svaka partija drugačija je zbog promjenjivog rasporeda ploče.', 4, null],
        ['Carcassonne', 'Hans im Glück', 'Obiteljska', 2000, 2, 5, 40, 'lagana',
         'Igra polaganja pločica u kojoj gradite srednjovjekovni krajolik s gradovima, cestama i samostanima. Svojim sljedbenicima zauzimate područja i skupljate bodove. Jednostavna pravila, velika dubina.', 3, null],
        ['Dixit', 'Libellud', 'Zabavna', 2008, 3, 6, 30, 'lagana',
         'Maštovita igra asocijacija s prekrasno ilustriranim kartama. Pripovjedač zadaje natuknicu, a ostali pogađaju koja je karta njegova. Nagrađena igra koja potiče kreativnost i smijeh.', 5, null],
        ['Ticket to Ride', 'Days of Wonder', 'Obiteljska', 2004, 2, 5, 60, 'srednja',
         'Gradite željezničke pruge preko karte i povezujete gradove kako biste ispunili tajne destinacijske karte. Lako se uči, a napeto je do zadnjeg vagona. Dobitnik nagrade Spiel des Jahres.', 3, null],
        ['Pandemic', 'Z-Man Games', 'Kooperativna', 2008, 2, 4, 45, 'srednja',
         'Surađujte kao tim stručnjaka koji zaustavlja četiri smrtonosne bolesti prije nego što preplave svijet. Ili svi pobijedite zajedno ili svi izgubite – igra protiv igrača ne postoji.', 2, null],
        ['7 Wonders', 'Repos Production', 'Strateška', 2010, 3, 7, 30, 'srednja',
         'Razvijajte svoju antičku civilizaciju kroz tri doba i sagradite jedno od sedam svjetskih čuda. Karte se istovremeno biraju i dodaju susjedu pa nema čekanja ni za sedam igrača.', 3, null],
        ['Codenames', 'Czech Games', 'Zabavna', 2015, 4, 8, 15, 'lagana',
         'Dva tima, dva špijuna i mreža tajnih agenata skrivenih iza riječi. Vođe daju natuknicu od jedne riječi, a suigrači pogađaju koje su kartice njihove. Savršena igra za društvo i zabave.', 4, null],
        ['Azul', 'Plan B Games', 'Apstraktna', 2017, 2, 4, 40, 'lagana',
         'Kao majstor pločica ukrašavate zidove palače u Portu. Pažljivo birate prekrasne keramičke pločice i slažete uzorke, pazeći da vam nijedna ne propadne. Elegantna i vizualno dojmljiva igra.', 3, null],
        ['Wingspan', 'Stonemaier Games', 'Strateška', 2019, 1, 5, 70, 'srednja',
         'Privlačite ptice u svoja staništa u ovoj prekrasno ilustriranoj igri o promatranju ptica. Svaka od stotina ptica ima jedinstvenu moć koja stvara lančane poteze. Igriva i u samačkom načinu.', 2, null],
        ['Munchkin', 'Steve Jackson Games', 'Kartaška', 2001, 3, 6, 90, 'lagana',
         'Duhovita kartaška igra koja parodira fantasy avanture. Otvarajte vrata tamnice, borite se s čudovištima, skupljajte plijen i izdajte prijatelje na putu do desete razine. Kaos i smijeh zajamčeni.', 4, null],
        ['Terraforming Mars', 'FryxGames', 'Strateška', 2016, 1, 5, 120, 'teška',
         'Kao korporacija preuzimate ulogu u preobrazbi Marsa u nastanjiv planet – podižete temperaturu, stvarate oceane i kisik. Duboka strateška igra za ljubitelje dugih i zahtjevnih partija.', 2, null],
        ['Uno', 'Mattel', 'Kartaška', 1971, 2, 10, 30, 'lagana',
         'Svjetski poznata kartaška igra brzog tempa. Riješite se svih karata slažući ih po boji ili broju i ne zaboravite viknuti „Uno!“ kad vam ostane samo jedna. Zabava za cijelu obitelj.', 6, null],
        ['Jenga', 'Hasbro', 'Spretnost', 1983, 1, 8, 20, 'lagana',
         'Toranj od 54 drvena bloka, mirna ruka i sve napetija atmosfera. Vadite blokove jedan po jedan i slažete ih na vrh dok se toranj ne sruši. Jednostavno, uzbudljivo i uvijek napeto.', 3, null],
        ['Gloomhaven', 'Cephalofair Games', 'Kooperativna', 2017, 1, 4, 120, 'teška',
         'Epska kampanjska igra u kojoj skupina pustolova istražuje tamnice i razvija svoje likove kroz povezanu priču od preko 90 scenarija. Jedna od najcjenjenijih društvenih igara svih vremena.', 1, null],
        ['Splendor', 'Space Cowboys', 'Strateška', 2014, 2, 4, 30, 'lagana',
         'Kao trgovac draguljima skupljate žetone i kupujete rudnike, prijevoz i dućane kako biste stekli ugled. Brza i elegantna igra upravljanja resursima s prekrasnim žetonima.', 3, null],
        ['Kingdomino', 'Blue Orange', 'Obiteljska', 2016, 2, 4, 25, 'lagana',
         'Spajate domino-pločice u kraljevstvo 5×5, povezujući livade, jezera i šume. Brza obiteljska igra s lakim pravilima koja je osvojila nagradu Spiel des Jahres 2017.', 3, null],
        ['Patchwork', 'Lookout Games', 'Apstraktna', 2014, 2, 2, 30, 'lagana',
         'Dvoje igrača natječe se u šivanju najljepšeg prošivenog pokrivača slažući Tetris-olike komade tkanine. Pametna igra za dvoje s puno taktičkog planiranja.', 2, null],
        ['Mysterium', 'Libellud', 'Kooperativna', 2015, 2, 7, 45, 'srednja',
         'Duh komunicira sa skupinom medija isključivo kroz snovite ilustracije, a oni moraju odgonetnuti tko je, čime i gdje počinio zločin. Atmosferična kooperativna igra zagonetki.', 2, null],
        ['Takenoko', 'Bombyx', 'Obiteljska', 2011, 2, 4, 45, 'srednja',
         'Brinete se o carskoj pandi i bambusovom vrtu, ispunjavajući zadatke uzgoja i navodnjavanja. Šarmantna obiteljska igra s dojmljivim figurama i vedrim ugođajem.', 2, null],
        ['Camel Up', 'Eggertspiele', 'Zabavna', 2014, 2, 8, 45, 'lagana',
         'Kladite se na lude utrke deva koje se znaju popeti jedna drugoj na leđa. Nepredvidiva i urnebesna igra u kojoj vodstvo zna planuti u trenu. Spiel des Jahres 2014.', 2, null],
        ['Love Letter', 'Z-Man Games', 'Kartaška', 2012, 2, 6, 20, 'lagana',
         'Igra dedukcije od samo 16 karata u kojoj pokušavate dostaviti ljubavno pismo princezi. Brza, prenosiva i iznenađujuće taktička za tako malu kutiju.', 4, null],
        ['The Crew', 'Kosmos', 'Kooperativna', 2019, 2, 5, 20, 'srednja',
         'Kooperativna igra uzimanja štihova u kojoj posada svemirskog broda zajedno ispunjava zadatke kroz 50 misija – bez razgovora o kartama. Inovativna i napeta.', 3, null],
        ['Brass: Birmingham', 'Roxley Games', 'Strateška', 2018, 2, 4, 120, 'teška',
         'Ekonomska strateška igra smještena u doba industrijske revolucije. Gradite tvornice, kanale i pruge te razvijate mrežu u Birminghamu. Jedna od najbolje ocijenjenih igara ikad.', 1, null],
        ['Everdell', 'Starling Games', 'Strateška', 2018, 1, 4, 80, 'srednja',
         'U šumskoj dolini Everdell gradite grad od životinja i građevina kroz četiri godišnja doba. Prekrasno ilustrirana igra postavljanja radnika s impresivnim 3D stablom.', 2, null],
        ['Root', 'Leder Games', 'Strateška', 2018, 2, 4, 90, 'teška',
         'Svaka frakcija u šumi igra po potpuno drugačijim pravilima u ovoj asimetričnoj ratnoj igri sladunjavog izgleda, ali oštre taktike. Mačke, ptice i pobunjenici bore se za prevlast.', 1, null],
        ['Spirit Island', 'Greater Than Games', 'Kooperativna', 2017, 1, 4, 120, 'teška',
         'Kao moćni duhovi otoka surađujete kako biste obranili svoju zemlju od kolonizatora. Zahtjevna kooperativna igra u kojoj vi napadate, a ne branite se. Duboka i nagrađujuća.', 1, null],
        ['Cascadia', 'Flatout Games', 'Apstraktna', 2021, 1, 4, 45, 'lagana',
         'Slažete pločice staništa i žetone divljih životinja pacifičkog sjeverozapada u skladne ekosustave. Opuštajuća, a domišljata igra. Spiel des Jahres 2022.', 3, null],
        ['Sushi Go!', 'Gamewright', 'Kartaška', 2013, 2, 5, 15, 'lagana',
         'Slatka igra biranja i predaje karata u kojoj skupljate najukusnije kombinacije suši jela. Brza, šarmantna i savršena za uvod u svijet društvenih igara.', 4, null],
        ['Blokus', 'Mattel', 'Apstraktna', 2000, 2, 4, 20, 'lagana',
         'Strateška igra u kojoj postavljate komade na ploču dodirujući samo svoje rubove. Cilj je smjestiti što više svojih komada i blokirati protivnike. Jednostavno i napeto.', 2, null],
        ['Just One', 'Repos Production', 'Zabavna', 2018, 3, 7, 20, 'lagana',
         'Kooperativna igra pogađanja riječi u kojoj svi daju po jednu natuknicu – ali jednake se natuknice poništavaju! Vedra, jednostavna i sjajna za veće društvo. Spiel des Jahres 2019.', 3, null],
        ['Scythe', 'Stonemaier Games', 'Strateška', 2016, 1, 5, 115, 'teška',
         'U alternativnim 1920-ima upravljate frakcijom u potrazi za bogatstvom i moći u zemlji golemih mehova. Spoj ekonomije, područja i prekrasne umjetnosti Jakuba Rozalskog.', 1, null],
        ['Scrabble', 'Mattel', 'Riječi', 1948, 2, 4, 60, 'srednja',
         'Bezvremenska igra slaganja riječi na ploči. Od slovnih pločica gradite riječi i skupljate bodove, iskorištavajući polja s bonusima. Klasik koji bogati rječnik svih naraštaja.', 2, null],
        ['Čovječe, ne ljuti se', 'Klasik', 'Obiteljska', 1907, 2, 4, 30, 'lagana',
         'Najdraža obiteljska igra mnogih naraštaja. Vodite svoje figurice oko ploče, izbacujte protivnike i prvi dovedite sve kući. Jednostavna, napeta i puna preokreta zbog kockice.', 4, null],
        ['Activity', 'Piatnik', 'Zabavna', 1990, 3, 16, 60, 'lagana',
         'Družeća igra u kojoj pojmove objašnjavate crtanjem, opisivanjem ili pantomimom dok ekipa pogađa. Idealna za velika društva i zajamčen izvor smijeha na svakoj zabavi.', 3, null],
        ['Monopoly', 'Hasbro', 'Obiteljska', 1935, 2, 8, 90, 'srednja',
         'Slavna igra kupovanja nekretnina, gradnje kuća i hotela te tjeranja protivnika u bankrot. Klasik koji zna trajati satima i zategnuti obiteljske odnose do pucanja.', 2, null],
        ['Carcassonne: Lovci i sakupljači', 'Hans im Glück', 'Obiteljska', 2002, 2, 5, 45, 'srednja',
         'Samostalna inačica Carcassonnea smještena u pretpovijesno doba. Polažete pločice rijeka, šuma i livada te lovite jelene i mamute. Svjež zaokret na voljenoj klasici.', 2, null]
    ];

    await veza.query(
        `INSERT INTO igre (naziv, izdavac, kategorija, godina, min_igraca, max_igraca, trajanje, tezina, opis, broj_primjeraka, slika_url) VALUES ?`,
        [igre]
    );
    console.log(`Ubaceno ${igre.length} igara.`);

    // 8) Pocetne posudbe - osmisljene da pokazu SVE situacije za demonstraciju:
    //    PREUZETO:    Ana/Catan (rok pred istek), Marko/Gloomhaven (KASNI; 1 primj. -> NEDOSTUPNO), Ivana/Pandemic
    //    REZERVIRANO: Ana/Pandemic (popunjava Pandemic -> NEDOSTUPNO), Marko/Codenames, Ivana/Azul  (cekaju admin potvrdu)
    //    VRACENO:     povijest posudbi (ujedno uvjet za pisanje recenzija)
    //    OTKAZANO:    Ana/Munchkin, Marko/Monopoly
    // (korisnik_id, igra_id, status, datum_rezervacije, datum_preuzimanja, rok_vracanja, datum_vracanja)
    await veza.query(`
        INSERT INTO posudbe (korisnik_id, igra_id, status, datum_rezervacije, datum_preuzimanja, rok_vracanja, datum_vracanja) VALUES
        (2, 1,  'preuzeto',    DATE_SUB(NOW(), INTERVAL 14 DAY), DATE_SUB(NOW(), INTERVAL 12 DAY), DATE_ADD(CURDATE(), INTERVAL 2 DAY),  NULL),
        (3, 14, 'preuzeto',    DATE_SUB(NOW(), INTERVAL 25 DAY), DATE_SUB(NOW(), INTERVAL 23 DAY), DATE_SUB(CURDATE(), INTERVAL 3 DAY),  NULL),
        (4, 5,  'preuzeto',    DATE_SUB(NOW(), INTERVAL 7 DAY),  DATE_SUB(NOW(), INTERVAL 5 DAY),  DATE_ADD(CURDATE(), INTERVAL 9 DAY),  NULL),
        (2, 5,  'rezervirano', DATE_SUB(NOW(), INTERVAL 2 DAY),  NULL, NULL, NULL),
        (3, 7,  'rezervirano', DATE_SUB(NOW(), INTERVAL 1 DAY),  NULL, NULL, NULL),
        (4, 8,  'rezervirano', DATE_SUB(NOW(), INTERVAL 3 DAY),  NULL, NULL, NULL),
        (2, 3,  'vraceno',     DATE_SUB(NOW(), INTERVAL 40 DAY), DATE_SUB(NOW(), INTERVAL 38 DAY), DATE_SUB(CURDATE(), INTERVAL 24 DAY), DATE_SUB(NOW(), INTERVAL 26 DAY)),
        (2, 4,  'vraceno',     DATE_SUB(NOW(), INTERVAL 50 DAY), DATE_SUB(NOW(), INTERVAL 48 DAY), DATE_SUB(CURDATE(), INTERVAL 34 DAY), DATE_SUB(NOW(), INTERVAL 40 DAY)),
        (3, 1,  'vraceno',     DATE_SUB(NOW(), INTERVAL 35 DAY), DATE_SUB(NOW(), INTERVAL 33 DAY), DATE_SUB(CURDATE(), INTERVAL 19 DAY), DATE_SUB(NOW(), INTERVAL 25 DAY)),
        (3, 6,  'vraceno',     DATE_SUB(NOW(), INTERVAL 22 DAY), DATE_SUB(NOW(), INTERVAL 20 DAY), DATE_SUB(CURDATE(), INTERVAL 6 DAY),  DATE_SUB(NOW(), INTERVAL 12 DAY)),
        (4, 3,  'vraceno',     DATE_SUB(NOW(), INTERVAL 28 DAY), DATE_SUB(NOW(), INTERVAL 26 DAY), DATE_SUB(CURDATE(), INTERVAL 12 DAY), DATE_SUB(NOW(), INTERVAL 18 DAY)),
        (4, 1,  'vraceno',     DATE_SUB(NOW(), INTERVAL 33 DAY), DATE_SUB(NOW(), INTERVAL 31 DAY), DATE_SUB(CURDATE(), INTERVAL 17 DAY), DATE_SUB(NOW(), INTERVAL 23 DAY)),
        (4, 9,  'vraceno',     DATE_SUB(NOW(), INTERVAL 19 DAY), DATE_SUB(NOW(), INTERVAL 17 DAY), DATE_SUB(CURDATE(), INTERVAL 3 DAY),  DATE_SUB(NOW(), INTERVAL 9 DAY)),
        (2, 10, 'otkazano',    DATE_SUB(NOW(), INTERVAL 6 DAY),  NULL, NULL, NULL),
        (3, 35, 'otkazano',    DATE_SUB(NOW(), INTERVAL 8 DAY),  NULL, NULL, NULL)
    `);

    // 9) Pocetne recenzije - svaka odgovara posudbi koju je taj clan stvarno preuzeo/vratio.
    //    Catan ima 3 recenzije (lijepo se vidi prosjecna ocjena), Dixit 2.
    await veza.query(`
        INSERT INTO recenzije (korisnik_id, igra_id, ocjena, komentar, datum) VALUES
        (2, 1, 4, 'Odličan klasik, trgovanje s igračima je najzabavniji dio. Zna ovisiti o sreći s kockicom, ali svejedno vrh.', DATE_SUB(NOW(), INTERVAL 3 DAY)),
        (3, 1, 5, 'Igra koja me uvela u cijeli hobi. Savršen spoj sreće i strategije — mora se imati u kolekciji.', DATE_SUB(NOW(), INTERVAL 22 DAY)),
        (4, 1, 5, 'Uvijek prođe sjajno u društvu. Svaka je partija drukčija zbog promjenjivog rasporeda ploče.', DATE_SUB(NOW(), INTERVAL 20 DAY)),
        (2, 3, 5, 'Najdraža igra za opuštene večeri. Prekrasne ilustracije i zajamčen smijeh za stolom.', DATE_SUB(NOW(), INTERVAL 24 DAY)),
        (4, 3, 4, 'Maštovita i drukčija od svega. Malo ovisi o društvu, ali tada je nezaboravna.', DATE_SUB(NOW(), INTERVAL 15 DAY)),
        (2, 4, 4, 'Lako se objasni, a napeto je do zadnjeg vagona. Idealna za obiteljske partije.', DATE_SUB(NOW(), INTERVAL 38 DAY)),
        (3, 6, 4, 'Sjajna kad je više igrača jer nema čekanja na potez. Treba par partija da se uđe u štos.', DATE_SUB(NOW(), INTERVAL 10 DAY)),
        (4, 9, 5, 'Prelijepa i opuštajuća, a ima dovoljno dubine. Najljepša igra koju imam.', DATE_SUB(NOW(), INTERVAL 7 DAY)),
        (4, 5, 5, 'Najbolji osjećaj zajedničke pobjede — napeto do samog kraja. Toplo preporučujem!', DATE_SUB(NOW(), INTERVAL 2 DAY))
    `);

    // 10) Pocetne omiljene igre (wishlist) - svaki clan ima nekoliko oznacenih
    await veza.query(`
        INSERT INTO omiljene (korisnik_id, igra_id) VALUES
        (2, 9), (2, 8), (2, 6),
        (3, 14), (3, 11), (3, 31),
        (4, 3), (4, 27), (4, 28)
    `);
    console.log('Pocetne posudbe, recenzije i omiljene ubacene.');

    // 11) Placeholder mape za slike svake igre: public/slike/<naziv>/
    //     (mapa se zove po imenu igre radi lakseg rucnog ubacivanja slika;
    //      .gitkeep cuva praznu mapu u gitu)
    const [sveIgre] = await veza.query('SELECT naziv FROM igre ORDER BY id');
    const mapaSlika = path.join(__dirname, '..', 'public', 'slike');
    fs.mkdirSync(mapaSlika, { recursive: true });
    for (const { naziv } of sveIgre) {
        const mapaIgre = path.join(mapaSlika, nazivUSlug(naziv));
        fs.mkdirSync(mapaIgre, { recursive: true });
        fs.writeFileSync(path.join(mapaIgre, '.gitkeep'), '');
    }
    console.log(`Stvorene placeholder mape za slike po imenu igre (public/slike/<naziv>/).`);

    await veza.end();
    console.log('');
    console.log('=== Baza podataka uspjesno inicijalizirana! ===');
    console.log('Prijava ADMIN:   admin@igraonica.hr / admin123');
    console.log('Prijava CLANOVI: ana.anic@gmail.com, marko.maric@gmail.com, ivana.kovac@gmail.com  (lozinka: lozinka123)');
    console.log('Aplikaciju pokrenite naredbom: npm start');
}

glavna().catch((greska) => {
    console.error('Greska pri inicijalizaciji baze:', greska.message);
    process.exit(1);
});
