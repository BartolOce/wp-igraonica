// =====================================================
// ilustracije.js - generirane SVG ilustracije "kutija" igara
// Ako igra nema pravu sliku (slika_url), prikazuje se tematska
// ilustracija prema kategoriji - radi offline i bez autorskih prava.
// Nudi i drugu varijantu (kockice) za galeriju na stranici igre.
// =====================================================

// Vintage paleta motiva po kategoriji: [pozadina1, pozadina2, naglasak]
const PALETA_KATEGORIJA = {
    'Strateška':    ['#2d5a4a', '#1f4034', '#e9c46a'],
    'Obiteljska':   ['#b5451d', '#8f3415', '#f1dcb8'],
    'Zabavna':      ['#c77d0a', '#a4640a', '#fff3d6'],
    'Kooperativna': ['#1d5a6e', '#134455', '#e9c46a'],
    'Kartaška':     ['#7d2233', '#5e1826', '#f1dcb8'],
    'Apstraktna':   ['#4a4e8c', '#363a6e', '#f1dcb8'],
    'Spretnost':    ['#8a5a2b', '#6b441f', '#f1dcb8'],
    'Riječi':       ['#3a6b35', '#2a4f27', '#f1dcb8'],
    'Dječja':       ['#c2410c', '#9a330a', '#fff3d6']
};

// Sigurnosna zamjena ako kategorija nije u paleti
const ZADANA_PALETA = ['#5a4632', '#41331f', '#f1dcb8'];

function paletaZa(kategorija) {
    return PALETA_KATEGORIJA[kategorija] || ZADANA_PALETA;
}

// Osnovna boja kategorije (za sitne ukrase drugdje u sucelju)
function bojaKategorije(kategorija) {
    return paletaZa(kategorija)[0];
}

// Motiv: par kockica (koristi se kao zadani i kao druga varijanta u galeriji)
function motivKockice(n) {
    return `<g fill="#f1dcb8" stroke="${n}" stroke-width="3">
        <rect x="98" y="60" width="52" height="52" rx="9" transform="rotate(-12 124 86)"/>
        <rect x="156" y="62" width="52" height="52" rx="9" transform="rotate(10 182 88)"/>
        <g fill="${n}" stroke="none">
            <circle cx="116" cy="78" r="4.5"/><circle cx="134" cy="96" r="4.5"/><circle cx="125" cy="87" r="4.5"/>
            <circle cx="172" cy="80" r="4.5"/><circle cx="192" cy="80" r="4.5"/>
            <circle cx="172" cy="100" r="4.5"/><circle cx="192" cy="100" r="4.5"/>
        </g>
    </g>`;
}

// Crta motiv (sredisnji crtez) ovisno o kategoriji.
function motivKategorije(kategorija, n) {
    switch (kategorija) {
        case 'Strateška': // heksagoni (poput plocica Catana)
            return `
                <g fill="none" stroke="${n}" stroke-width="4" opacity="0.92">
                    <polygon points="150,38 178,54 178,86 150,102 122,86 122,54" fill="${n}" fill-opacity="0.18"/>
                    <polygon points="116,74 144,90 144,122 116,138 88,122 88,90"/>
                    <polygon points="184,74 212,90 212,122 184,138 156,122 156,90"/>
                </g>`;
        case 'Obiteljska': // tri meeple figurice
            return `<g fill="${n}">${[110, 150, 190].map((x, i) => `
                <g transform="translate(${x},${88 + (i === 1 ? -10 : 0)})">
                    <circle cx="0" cy="-16" r="9"/>
                    <path d="M-14,16 C-14,-2 -8,-6 0,-6 C8,-6 14,-2 14,16 Z"/>
                </g>`).join('')}</g>`;
        case 'Zabavna': // konfeti i serpentine
            return `<g opacity="0.95">
                ${[['#e9c46a', 95, 60], ['#e76f51', 150, 45], ['#f1dcb8', 205, 62], ['#e9c46a', 125, 100], ['#e76f51', 185, 108], ['#f1dcb8', 95, 120], ['#e9c46a', 215, 118]]
                    .map(([c, x, y], i) => i % 2 === 0
                        ? `<rect x="${x}" y="${y}" width="14" height="14" rx="2" fill="${c}" transform="rotate(${i * 35} ${x} ${y})"/>`
                        : `<circle cx="${x}" cy="${y}" r="7" fill="${c}"/>`).join('')}
            </g>`;
        case 'Kooperativna': // krug suradnje
            return `<g fill="none" stroke="${n}" stroke-width="9" stroke-linecap="round" opacity="0.92">
                    <circle cx="150" cy="88" r="34" stroke-dasharray="4 26"/>
                    <circle cx="150" cy="88" r="14" fill="${n}" stroke="none"/>
                </g>`;
        case 'Kartaška': // lepeza karata
            return `<g stroke="${n}" stroke-width="3">
                ${[-22, 0, 22].map((rot, i) => `
                    <rect x="128" y="50" width="44" height="64" rx="6" fill="#f1dcb8"
                          transform="rotate(${rot} 150 110)"/>
                    <circle cx="150" cy="82" r="7" fill="${['#b5451d', '#2d5a4a', '#7d2233'][i]}"
                          transform="rotate(${rot} 150 110)"/>`).join('')}
            </g>`;
        case 'Apstraktna': // geometrijski oblici
            return `<g opacity="0.95">
                <circle cx="115" cy="80" r="22" fill="${n}"/>
                <rect x="148" y="58" width="44" height="44" rx="4" fill="#e76f51"/>
                <polygon points="150,96 178,130 122,130" fill="#e9c46a"/>
            </g>`;
        case 'Spretnost': // toranj od blokova (Jenga)
            return `<g fill="${n}" stroke="#6b441f" stroke-width="2">
                ${[0, 1, 2, 3].map((r) => [0, 1, 2].map((c) =>
                    `<rect x="${118 + c * 22}" y="${118 - r * 16}" width="20" height="14" rx="1"/>`
                ).join('')).join('')}
            </g>`;
        case 'Riječi': // slovne plocice
            return `<g font-family="Georgia, serif" font-weight="700" font-size="30" fill="#41331f">
                ${[['I', 110], ['G', 140], ['R', 172], ['A', 204]].map(([s, x]) => `
                    <rect x="${x - 16}" y="62" width="32" height="36" rx="4" fill="#f1dcb8" stroke="${n}" stroke-width="2"/>
                    <text x="${x}" y="88" text-anchor="middle">${s}</text>`).join('')}
            </g>`;
        default: // par kockica
            return motivKockice(n);
    }
}

// Brojac instanci - svaki SVG dobiva jedinstven id gradijenta. Bez ovoga bi
// vise igara iste kategorije u katalogu dijelilo isti id (nevazeci HTML).
let brojacSVG = 0;

// Omotac: gradi kompletan SVG s pozadinom, uzorkom tockica i zadanim motivom.
// "sufiks" razlikuje varijante na istoj stranici (a = motiv, b = kockice).
function omotacSVG(kategorija, motivHTML, sufiks) {
    const [poz1, poz2, naglasak] = paletaZa(kategorija);
    const id = 'grad-' + sufiks + (brojacSVG++);
    return `
        <svg class="kutija-svg" viewBox="0 0 300 176" preserveAspectRatio="xMidYMid slice"
             xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ilustracija kategorije ${kategorija}">
            <defs>
                <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="${poz1}"/>
                    <stop offset="1" stop-color="${poz2}"/>
                </linearGradient>
            </defs>
            <rect width="300" height="176" fill="url(#${id})"/>
            <g opacity="0.10" fill="${naglasak}">
                ${Array.from({ length: 6 }, (_, r) => Array.from({ length: 10 }, (_, c) =>
                    `<circle cx="${15 + c * 30}" cy="${15 + r * 30}" r="2.5"/>`).join('')).join('')}
            </g>
            ${motivHTML}
        </svg>`;
}

// Glavna ilustracija (motiv prema kategoriji)
function ilustracijaKategorije(kategorija) {
    const naglasak = paletaZa(kategorija)[2];
    return omotacSVG(kategorija, motivKategorije(kategorija, naglasak), 'a');
}

// Druga varijanta ilustracije (kockice) - za galeriju na stranici igre
function ilustracijaKockice(kategorija) {
    const naglasak = paletaZa(kategorija)[2];
    return omotacSVG(kategorija, motivKockice(naglasak), 'b');
}
