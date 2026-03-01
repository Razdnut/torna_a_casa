# Torna a Casa

Applicazione web/mobile per il calcolo degli orari di lavoro, la gestione delle pause pranzo e dei permessi dei dipendenti.

NOTA: QUESTA APP È STATA CREATA IN VIBE CODING!

## Requisiti

- [Node.js](https://nodejs.org/) e [pnpm](https://pnpm.io/) installati sulla macchina.

## Avvio rapido

1. Installare le dipendenze con `pnpm install`.
2. Avviare l'applicazione in modalità sviluppo con `pnpm dev`.

I componenti principali si trovano nella cartella `src/`: i componenti React sono in `src/components` e le pagine in `src/pages`.

Per una build di produzione eseguire `pnpm build` e lanciare l'anteprima con `pnpm preview`.

## Utilizzo dell'APK

Il repository include una GitHub Action per creare automaticamente l'APK di release.

1. Configura i secret GitHub necessari per la firma:
   - `ANDROID_KEYSTORE_BASE64`
   - `ANDROID_KEYSTORE_PASSWORD`
   - `ANDROID_KEY_ALIAS`
   - `ANDROID_KEY_PASSWORD`
2. Genera una nuova release eseguendo `git tag v1.0.0 && git push origin v1.0.0` oppure avviando manualmente il workflow **Android Release** dalla sezione *Actions*.
3. Scarica l'APK dalla pagina della release o dagli artefatti del workflow.
4. Copia il file sul dispositivo Android, abilita l'installazione da **origini sconosciute** e apri l'APK per installare l'app.

### Nota sicurezza APK
- Il workflow pubblica solo APK **firmati**.
- Se i secret di firma non sono configurati, la build release viene bloccata.

## Deploy con Docker

È possibile eseguire l'app in un container già pronto usando Docker Compose.

Prima dell'avvio, imposta il digest immutabile dell'immagine in `.env`:

```sh
TORNACASA_IMAGE_DIGEST=sha256:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Poi avvia con:

```sh
docker compose up -d
```

L'applicazione sarà disponibile su `http://localhost:8080`.

Per arrestare il container eseguire `docker compose down`.

## APK

Apk per android in release.

<div align="left">

  ![GitHub profile-details](http://github-profile-summary-cards.vercel.app/api/cards/profile-details?username=Razdnut&theme=material_palenight)

</div>