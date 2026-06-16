@echo off
REM ============================================
REM  Igraonica - postavljanje pocetne baze
REM  Stvara bazu "igraonica" sa 5 tablica i seed podacima.
REM  VAZNO: prije ovoga pokreni MySQL u XAMPP-u.
REM  PAZNJA: ovo BRISE postojecu bazu i radi je iznova!
REM ============================================
cd /d "%~dp0"

echo ============================================
echo   IGRAONICA - postavljanje pocetne baze
echo ============================================
echo.
echo Ova skripta ce:
echo   - obrisati postojecu bazu "igraonica" (ako postoji)
echo   - napraviti je iznova sa svih 5 tablica
echo   - ubaciti pocetne podatke (36 igara, probni racuni, ...)
echo.
echo VAZNO: MySQL mora biti pokrenut u XAMPP Control Panelu.
echo.

set /p potvrda="Nastaviti i resetirati bazu? (D/N): "
if /i not "%potvrda%"=="D" (
    echo.
    echo Prekinuto. Baza NIJE promijenjena.
    pause
    exit /b
)

echo.
call npm run init-baza

echo.
pause
