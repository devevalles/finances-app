# 💰 Finances App

Una aplicació web progressiva (PWA) per gestionar les finances personals de forma senzilla, segura i des de qualsevol dispositiu.

🌐 **Accés en línia:** [https://devevalles.github.io/finances-app/](https://devevalles.github.io/finances-app/)

---

## Què és Finances App?

Finances App és una eina de control econòmic personal dissenyada per funcionar directament al navegador, sense necessitat d'instal·lar res. Permet registrar despeses i ingressos, importar extractes bancaris en PDF, visualitzar tendències mensuals i mantenir les dades sempre disponibles, fins i tot sense connexió a internet.

L'aplicació està pensada per a ús diari: és ràpida, minimalista i funciona com una app nativa al mòbil gràcies a la tecnologia PWA.

---

## Funcionalitats principals

### 🔐 Seguretat i accés
- Autenticació biométrica (Face ID / empremta digital) via WebAuthn
- Pantalla de bloqueig amb rellotge i data
- Accés alternatiu per toc en cas que la biometria no estigui disponible

### ➕ Gestió de moviments
- Afegir, editar i eliminar despeses i ingressos
- Notes descriptives per a cada transacció (màx. 100 caràcters)
- Selecció del mètode de pagament: targeta, efectiu, transferència o Bizum
- Selecció de data personalitzada per a cada moviment

### 🗂️ Categories
**Despeses (10):** Alimentació · Restaurants · Transport · Entreteniment · Salut · Roba · Llar · Subscripcions · Educació · Altres

**Ingressos (6):** Salari · Freelance · Bizum · Transferència · Regal · Altres ingressos

### 🔗 Sistema de compensacions
- Vincula ingressos a despeses per calcular el cost net real
- Indicadors visuals als moviments vinculats
- Desvinculació individual o massiva

### 📊 Resum i estadístiques
- Resum mensual amb total d'ingressos, despeses i estalvi net
- Desglossament per categories amb barres de percentatge
- Estadístiques: nombre de transaccions, despesa màxima i despesa mitjana
- Gràfic de tendències dels últims 6 mesos (ingressos vs. despeses)

### 📄 Importació de PDF bancaris
- Càrrega d'extractes bancaris en format PDF
- Extracció automàtica de transaccions (data, import, descripció)
- Categorització automàtica per paraules clau (ex: "MERCADONA" → Alimentació)
- Vista prèvia amb possibilitat d'ajustar categories abans d'importar
- Deduplicació per evitar duplicats

### 🔍 Cerca de transaccions
- Barra de cerca a la pestanya Moviments
- Filtra en temps real per categoria, nota o import
- Compatible amb els filtres de tipus (totes / despeses / ingressos)

### 💾 Còpia de seguretat i exportació
- Exportació de totes les dades en format JSON (còpia de seguretat)
- Exportació a CSV compatible amb Excel i Google Sheets
- Importació amb opció de fusionar o substituir les dades existents
- Emmagatzematge local al dispositiu (localStorage), sense servidor extern

### 🧭 Navegació i interfície
**Tres pestanyes principals:**
1. **Inici** — Resum del mes actual i últimes 6 transaccions
2. **Moviments** — Llistat complet filtrable i cercable, agrupat per mes
3. **Resum** — Estadístiques mensuals i gràfic de tendències

- Navegació per gestos (swipe esquerra/dreta entre pestanyes)
- Menú contextual per a cada transacció: editar, compensar, vincular, eliminar
- Disseny adaptat a mòbil amb suport per a entalles de pantalla

---

## Tecnologia

- **Vanilla JavaScript** — sense dependències de frameworks
- **PDF.js** — per llegir i extreure text d'extractes bancaris
- **WebAuthn** — per a l'autenticació biométrica
- **Service Worker** — per al funcionament offline (PWA)
- **localStorage** — per a la persistència de dades al dispositiu

---

## Instal·lació local

### Requisits
- Python 3.x (per arrencar el servidor local)
- Navegador modern amb suport PWA (Chrome, Safari, Edge)

### Passos

```bash
# Clonar el repositori
git clone https://github.com/devevalles/finances-app.git
cd finances-app
```

**Opció 1 — Servidor HTTP (sense HTTPS):**
```bash
python -m http.server 8080
```

**Opció 2 — Servidor HTTPS local (recomanat per a biometria i PWA):**
```bash
python generate-https-cert.py   # genera el certificat autofirmat
python https-server.py           # arrenca el servidor
```

O a Windows, executa directament `start-server.bat` o `start-server-https.bat`.

Obre el navegador a `http://localhost:8080` (o `https://localhost:8443` amb HTTPS).

---

## Últimes actualitzacions

### v12 — Abril 2026
- Cerca dins de les finestres de detall de categoria (Resum → Despeses/Ingressos)
- Balanç positiu mostra el box de Finances en verd
- Tendències configurables: 3 mesos, 6 mesos o 1 any
- Estadística "Mitjana" eliminada; "Major despesa" és ara clicable
- Botons d'acció (···, Importar PDF, Afegir) amb més contrast visual

### v11 — Abril 2026
- Cerca de transaccions en temps real (per categoria, nota o import)
- Exportació a CSV per a Excel i Google Sheets

### v10 — Abril 2026
- Millores de rendiment en la càrrega del service worker
- Sistema de compensacions refinat amb desvinculació massiva

---

## Llicència

Ús personal. Tots els drets reservats © David Vallès.
