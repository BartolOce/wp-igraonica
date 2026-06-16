# Slike igara

Svaka igra ima svoju mapu: `public/slike/<id igre>/`.

## Kako dodati sliku igri
1. Spremi sliku u mapu igre, npr. `public/slike/1/box.jpg`.
2. U aplikaciji: **Administracija → Upravljanje katalogom → Uredi** igru, pa u polje **Slika igre** upiši putanju: `/slike/1/box.jpg`.
3. Spremi. Slika se prikazuje na kartici u katalogu i u galeriji na stranici igre.

## Napomene
- **Mape se stvaraju automatski**: za sve igre pri `npm run init-baza`, a za svaku novu igru čim ju spremiš u administraciji.
- Ako slika nedostaje ili je putanja kriva, **automatski se prikazuje tematska ilustracija** — stranica nikad ne ostane prazna.
- Slike su dio projekta (lokalne), pa ne ovise o vanjskim poveznicama koje mogu nestati.
- Preporučeni formati: `.jpg`, `.png`, `.webp`. Slika kutije najbolje izgleda u omjeru blizu kvadrata.
- `.gitkeep` datoteke samo čuvaju prazne mape u gitu — slobodno ih ostavi.
