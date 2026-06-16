// =====================================================
// autorizacija.js - middleware za provjeru prijave i ovlasti
// samoPrijavljeni trazi prijavu, samoAdmin trazi ulogu "admin".
// =====================================================

// Dopusta pristup samo prijavljenim korisnicima
function samoPrijavljeni(req, res, next) {
    if (!req.session.korisnik) {
        return res.status(401).json({ greska: 'Morate biti prijavljeni za ovu radnju.' });
    }
    next();
}

// Dopusta pristup samo administratorima
function samoAdmin(req, res, next) {
    if (!req.session.korisnik) {
        return res.status(401).json({ greska: 'Morate biti prijavljeni za ovu radnju.' });
    }
    if (req.session.korisnik.uloga !== 'admin') {
        return res.status(403).json({ greska: 'Samo administrator ima pristup ovoj radnji.' });
    }
    next();
}

module.exports = { samoPrijavljeni, samoAdmin };
