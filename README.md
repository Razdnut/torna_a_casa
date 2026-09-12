# Torna a Casa

![Build Android Release](https://github.com/Razdnut/torna_a_casa/actions/workflows/android-release.yml/badge.svg)
![Deploy to GitHub Pages](https://github.com/Razdnut/torna_a_casa/actions/workflows/deploy-pages.yml/badge.svg)
[![AI-DECLARATION: copilot](https://img.shields.io/badge/䷼%20AI--DECLARATION-copilot-fee2e2?labelColor=fee2e2)](https://ai-declaration.md)

An Android application designed for monitoring employee work hours, specifically tailored for the Italian public sector. This hybrid mobile/web application allows employees to track their entry and exit times, manage lunch breaks, and record leaves or permits.

## Features

*   **Work Hour Tracking:** Accurately record daily entry and exit times.
*   **Lunch Break Management:** Log and manage lunch breaks within working hours.
*   **Leave and Permit Management:** Keep track of approved leaves and permits.
*   **Local Data Storage:** Utilizes SQLite for robust and efficient local data management via Capacitor.
*   **Italian Public Sector Focus:** Designed with the specific needs and regulations of Italian public sector employees in mind.
*   **Cross-platform (Android & Web):** Available as a native Android application and a web version.

## Demo

A live demo of the web application is available on GitHub Pages:
[https://razdnut.github.io/torna_a_casa/](https://razdnut.github.io/torna_a_casa/)

## Technology Stack

This project is built using modern web and mobile development technologies:

*   **Frontend:** React, TypeScript
*   **Styling:** Tailwind CSS, shadcn/ui components
*   **Icons:** Lucide React
*   **Routing:** React Router
*   **Mobile Hybrid Framework:** Capacitor (for Android application)
*   **Package Manager:** pnpm
*   **Database:** SQLite (via Capacitor Community SQLite plugin)

## Installation (for Developers)

To set up the project for development on your local machine, follow these steps:

### Prerequisites

*   [Node.js](https://nodejs.org/) (version 20 or higher recommended)
*   [pnpm](https://pnpm.io/) (version 9 or higher recommended)

### Getting Started

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Razdnut/torna_a_casa.git
    cd torna_a_casa
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Run the application in development mode:**
    ```bash
    pnpm dev
    ```
    The web application will typically be available at `http://localhost:5173/`.

### Project Structure

The main source code is located in the `src/` folder:
*   React components are in `src/components/`.
*   Application pages are in `src/pages/`.

## Building for Production

### Web Application

To create a production-ready build of the web application:

```bash
pnpm build
```

You can preview the production build locally with:

```bash
pnpm preview
```

### Android APK

The repository includes a GitHub Action to automatically build and sign the release APK.

1.  **Configure GitHub Secrets for Signing:**
    To enable the secure signing of the APK, you need to set the following secrets in your GitHub repository settings:
    *   `ANDROID_KEYSTORE_BASE64`: The base64 encoded content of your `.jks` keystore file.
    *   `ANDROID_KEYSTORE_PASSWORD`: The password for your keystore.
    *   `ANDROID_KEY_ALIAS`: The alias for your key within the keystore.
    *   `ANDROID_KEY_PASSWORD`: The password for your key.

2.  **Generate a new Release:**
    *   **Via Git Tag:** Push a new tag to trigger the workflow:
        ```bash
        git tag v1.0.0
        git push origin v1.0.0
        ```
    *   **Manually:** Go to the "Actions" tab in your GitHub repository, select the **Android Release** workflow, and click "Run workflow" to trigger it manually. You can specify a tag and release name.

3.  **Download and Install the APK:**
    *   Once the workflow completes, the signed `tornacasa.apk` will be attached to the new GitHub Release created on your repository's Releases page.
    *   Alternatively, you can download the APK from the workflow run artifacts in the Actions tab.
    *   Copy the `tornacasa.apk` file to your Android device.
    *   Enable installation from **unknown sources** in your device settings.
    *   Open the APK file on your device to install the application.

    **Security Note:** The workflow ensures that only **signed** APKs are published. If the signing secrets are not configured correctly, the release build will be blocked.

## Docker Deployment

You can run the web application in a pre-built Docker container using Docker Compose.

1.  **Set the Immutable Image Digest:**
    Before starting, set the immutable digest of the Docker image in a `.env` file at the root of the project. Replace `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` with the actual digest:

    ```sh
    TORNACASA_IMAGE_DIGEST=sha256:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    ```

2.  **Start the Container:**
    ```bash
    docker compose up -d
    ```
    The application will be available at `http://localhost:8080`.

3.  **Stop the Container:**
    ```bash
    docker compose down
    ```

## Contributing

We welcome contributions! If you'd like to contribute, please fork the repository, create a new branch, and submit a pull request. For major changes, please open an issue first to discuss what you would like to change.

## License

MIT

---

<div align="left">

  ![GitHub profile-details](http://github-profile-summary-cards.vercel.app/api/cards/profile-details?username=Razdnut&theme=material_palenight)

</div>

## Schermata Oggi, backup e resoconti

- **Oggi** è la pagina iniziale: orario previsto di uscita, tempo restante aggiornato automaticamente, stato della giornata e sequenza ingresso / pausa / rientro / uscita. Le azioni rapide salvano immediatamente; gli orari restano modificabili dal tracker.
- **Impostazioni → Backup e ripristino** esporta un file JSON versionato con tutte le giornate, le assenze, i plafond e l'autosalvataggio. L'importazione (massimo 20 MB) valida il file prima di mostrare l'anteprima. Per impostazione predefinita mantiene le registrazioni già presenti; una scelta esplicita permette di sostituirle. Le impostazioni vengono importate, mentre i dati non presenti nel file rimangono sul dispositivo. Il ripristino è atomico (transazione SQLite su Android, singola scrittura del documento locale sul web).
- **Archivio → Resoconto mensile** ricalcola i totali dagli orari, include le assenze e permette l'esportazione PDF e CSV UTF-8 con separatore `;`. Giornate incomplete, orari incoerenti e sovrapposizioni sono evidenziati con collegamenti alle correzioni. È possibile esportare anche con anomalie: queste sono riportate nel file e le relative presenze sono escluse dai totali orari.
- Sul **web** i dati sono conservati nel browser anche dopo un ricaricamento; su **Android** restano nel database SQLite. I file esportati vengono scaricati dal browser oppure passati al pannello di condivisione Android, dove scegliere la destinazione. Il backup è in chiaro e deve essere conservato privatamente. La data mostrata indica l'ultima esportazione, non garantisce la conservazione del file da parte della destinazione scelta.

Le regole restano: obiettivo 7h12, pausa minima 30 minuti, ingresso dalle 07:30, uscita entro le 19:00 e pausa nella fascia 12:00–15:00. I permessi vengono recuperati: le ore effettive escludono pausa e permesso; il saldo usa queste ore rispetto all'obiettivo. Il conteggio assenze resta lunedì–venerdì, senza calendario delle festività. I giorni senza registrazioni non producono automaticamente un debito.

### Verifiche di sviluppo

Usare Node.js 22.18+ oppure 24 per eseguire direttamente i test TypeScript:

```sh
pnpm test
pnpm exec tsc -p tsconfig.app.json --noEmit
pnpm lint
pnpm build
pnpm exec cap sync android
```

Per la compilazione Android occorrono JDK 21 e Android SDK 35. I test coprono sequenza giornaliera, pause e permessi, validazione dei backup, anomalie, conteggi mensili e protezione dei campi CSV da formule. Le prove manuali nel browser devono includere esportazione/importazione, scelta di sovrascrittura, riapertura dei dati e visualizzazione mobile.
