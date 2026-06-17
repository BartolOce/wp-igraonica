@echo off
REM ============================================
REM  Igraonica - pokretanje Node/Express servera
REM  Dvoklik na ovu datoteku pokrece posluzitelj.
REM  Prije pokretanja provjerava Node.js i po potrebi
REM  automatski instalira potrebne ovisnosti (npm install).
REM  VAZNO: prije ovoga pokreni MySQL u XAMPP-u.
REM ============================================
cd /d "%~dp0"

echo ============================================
echo   IGRAONICA - pokretanje posluzitelja
echo ============================================
echo.

REM --- Provjera je li Node.js (i npm) instaliran ---
where node >nul 2>nul
if errorlevel 1 (
    echo [GRESKA] Node.js nije pronaden na ovom racunalu.
    echo Preuzmi i instaliraj Node.js LTS sa: https://nodejs.org
    echo Nakon instalacije ponovno pokreni ovu skriptu.
    echo.
    pause
    exit /b 1
)

REM --- Provjera potrebnih ovisnosti; ako bilo koja fali, instaliraj sve ---
set TREBA_INSTALIRATI=0
if not exist "node_modules\express\"         set TREBA_INSTALIRATI=1
if not exist "node_modules\express-session\" set TREBA_INSTALIRATI=1
if not exist "node_modules\mysql2\"          set TREBA_INSTALIRATI=1
if not exist "node_modules\bcryptjs\"        set TREBA_INSTALIRATI=1

if "%TREBA_INSTALIRATI%"=="1" (
    echo Potrebne ovisnosti nisu pronadene - instaliram ih sada...
    echo Ovo moze potrajati nekoliko minuta pri prvom pokretanju.
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo [GRESKA] Instalacija ovisnosti nije uspjela.
        echo Provjeri internetsku vezu i pokusaj ponovno.
        echo.
        pause
        exit /b 1
    )
    echo.
    echo Ovisnosti su uspjesno instalirane.
    echo.
) else (
    echo Sve potrebne ovisnosti su vec instalirane.
    echo.
)

echo [1] Provjeri da je MySQL pokrenut u XAMPP Control Panelu.
echo [2] Posluzitelj ce biti dostupan na: http://localhost:3000
echo [3] Za zaustavljanje: zatvori ovaj prozor ili pritisni Ctrl+C.
echo.

call npm start

echo.
echo Posluzitelj je zaustavljen.
pause
