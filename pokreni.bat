@echo off
REM ============================================
REM  Igraonica - pokretanje Node/Express servera
REM  Dvoklik na ovu datoteku pokrece posluzitelj.
REM  VAZNO: prije ovoga pokreni MySQL u XAMPP-u.
REM ============================================
cd /d "%~dp0"

echo ============================================
echo   IGRAONICA - pokretanje posluzitelja
echo ============================================
echo.
echo [1] Provjeri da je MySQL pokrenut u XAMPP Control Panelu.
echo [2] Posluzitelj ce biti dostupan na: http://localhost:3000
echo [3] Za zaustavljanje: zatvori ovaj prozor ili pritisni Ctrl+C.
echo.

call npm start

echo.
echo Posluzitelj je zaustavljen.
pause
