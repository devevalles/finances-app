@echo off
echo.
echo  Finances App - Servidor local
echo  ==============================
echo.
echo  Obri Safari a l'iPhone i ves a:
echo  http://%COMPUTERNAME%:8000/preview.html
echo.
echo  (O busca la IP del PC: ipconfig / cerca "Dirección IPv4")
echo.
echo  Prem Ctrl+C per aturar el servidor.
echo.
cd /d "%~dp0"
python -m http.server 8000
pause
