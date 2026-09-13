# Torna a Casa

> 🇮🇹 **Lingua:** Italiano · [🇬🇧 English](README.md)

![Build Android Release](https://github.com/Razdnut/torna_a_casa/actions/workflows/android-release.yml/badge.svg)
![Deploy to GitHub Pages](https://github.com/Razdnut/torna_a_casa/actions/workflows/deploy-pages.yml/badge.svg)
[![AI-DECLARATION: copilot](https://img.shields.io/badge/䷼%20AI--DECLARATION-copilot-fee2e2?labelColor=fee2e2)](https://ai-declaration.md)

**Torna a Casa** è un’app Android e web per registrare l’orario di lavoro. È pensata per le esigenze dei dipendenti della pubblica amministrazione italiana: registra entrate e uscite, gestisce pause, assenze e permessi, mostra il saldo mensile e conserva i dati sul dispositivo.

## Funzionalità

- **Rilevazione giornaliera:** Registra ingresso, pausa, rientro e uscita.
- **Panoramica della giornata:** Mostra orario previsto di uscita, tempo restante, avanzamento e saldo mensile.
- **Pause, assenze e permessi:** Gestisce pause e ore di assenza o permesso approvate.
- **Archivio ed esportazioni mensili:** Consulta presenze, assenze e saldi; esporta PDF e CSV.
- **Backup e ripristino:** Esporta un backup JSON versionato, lo valida prima dell’importazione e permette di conservare o sostituire le registrazioni esistenti.
- **Dati locali:** Sul web i dati restano nel browser; su Android nel database SQLite.
- **Temi:** Scegli tra Classico, Dim e Smeraldo.
- **Android e web:** Usa l’app nativa Android oppure la versione web.

## Demo

La versione web è disponibile su [razdnut.github.io/torna_a_casa](https://razdnut.github.io/torna_a_casa/).

## Schermate dell’app

Le immagini usano dati dimostrativi e sono in formato smartphone 1080×1920.

### La giornata a colpo d’occhio

![Dashboard con previsione dell'orario di uscita, avanzamento della giornata e saldo mensile](screenshots/01-dashboard-oggi.png)

### Tracker giornaliero

![Tracker degli orari di lavoro con salvataggio automatico e avanzamento dell'obiettivo, nel tema Dim](screenshots/02-tracker-giornaliero.png)

### Archivio ed esportazioni mensili

![Resoconto mensile con presenze, assenze, saldo ed esportazione in PDF o CSV](screenshots/03-archivio-mensile.png)

### Backup e temi

![Impostazioni per backup e ripristino, con selezione dei temi Classico, Dim e Smeraldo](screenshots/04-impostazioni-e-temi.png)

## Regole di lavoro

Le regole predefinite sono: obiettivo di 7 ore e 12 minuti, pausa minima di 30 minuti, ingresso dalle 07:30, uscita entro le 19:00 e pausa nella fascia 12:00–15:00. Le ore effettive escludono pausa e permesso; il saldo confronta le ore effettive con l’obiettivo. Le assenze sono contate dal lunedì al venerdì e le festività non sono ancora incluse.

Giornate incomplete, orari incoerenti e sovrapposizioni sono evidenziati nel resoconto mensile. È comunque possibile esportare un resoconto con anomalie: le anomalie sono riportate nel file e le presenze interessate sono escluse dai totali orari.

## Tecnologie

- **Frontend:** React e TypeScript
- **Stile:** Tailwind CSS e shadcn/ui
- **Icone:** Lucide React
- **Routing:** React Router
- **Runtime mobile:** Capacitor per Android
- **Database locale:** Capacitor Community SQLite
- **Gestore pacchetti:** pnpm

## Sviluppo

### Requisiti

- [Node.js](https://nodejs.org/) 22.18+ oppure 24
- [pnpm](https://pnpm.io/) 9+

### Avvio

```bash
git clone https://github.com/Razdnut/torna_a_casa.git
cd torna_a_casa
pnpm install
pnpm dev
```

Il server di sviluppo è normalmente disponibile su `http://localhost:5173/`.

Il codice principale è in `src/`; i componenti React sono in `src/components/` e le pagine in `src/pages/`.

### Verifiche

```sh
pnpm test
pnpm exec tsc -p tsconfig.app.json --noEmit
pnpm lint
pnpm build
pnpm exec cap sync android
```

Per Android occorrono JDK 21 e Android SDK 35. Nel browser verificare esportazione e importazione, scelta di sovrascrittura nel ripristino, riapertura dei dati e layout mobile.

## Build e release

### Web

```bash
pnpm build
pnpm preview
```

### APK Android

Il workflow GitHub Actions **Android Release** compila e firma gli APK di release. Prima di creare una release configura questi segreti nel repository:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Per creare una release tramite tag:

```bash
git tag v1.5.0
git push origin v1.5.0
```

In alternativa avvia il workflow manualmente dalla scheda **Actions** del repository. L’APK firmato è allegato alla GitHub Release ed è disponibile anche come artefatto del workflow.

## Docker

L’immagine container pubblicata è `ghcr.io/razdnut/torna-a-casa`. Docker Compose usa per impostazione predefinita la versione `1.5.0`.

Per scegliere una versione pubblicata diversa, crea un file `.env` nella root del progetto:

```sh
TORNACASA_IMAGE_TAG=1.5.0
```

Avvia l’app su `http://localhost:8080`:

```bash
docker compose up -d
```

Per fermarla:

```bash
docker compose down
```

## Contribuire

I contributi sono benvenuti. Fai un fork del repository, crea un branch e apri una pull request. Per modifiche importanti apri prima una issue così da discutere l’approccio.

## Licenza

Questo progetto è distribuito secondo la [GNU Affero General Public License v3.0](LICENSE) (`AGPL-3.0-only`).

---

<div align="left">

  ![GitHub profile-details](http://github-profile-summary-cards.vercel.app/api/cards/profile-details?username=Razdnut&theme=material_palenight)

</div>
