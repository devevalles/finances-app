@echo off
cd /d "%~dp0"
echo.
echo  Finances App - Servidor HTTPS
echo  ================================
echo.
if not exist cert.pem (
    echo  Generant certificat HTTPS per primera vegada...
    python generate-https-cert.py
    echo.
    echo  IMPORTANT: Abans de continuar, instal·la el certificat al iPhone:
    echo.
    echo  1. Obre el servidor HTTP normal: dobla clic a start-server.bat
    echo  2. Al iPhone, Safari -^> http://192.168.1.34:8000/cert.pem
    echo  3. Segueix els passos per instal·lar el perfil
    echo  4. Ajustos -^> General -^> Quant a -^> Configuracio de confianca del certificat
    echo  5. Activa la confianca total per "Finances App"
    echo  6. Tanca el servidor HTTP i torna a executar aquest fitxer
    echo.
    pause
)
python https-server.py
pause
