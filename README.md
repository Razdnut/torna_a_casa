# Torna a Casa

Applicazione web/mobile per il calcolo degli orari di lavoro, la gestione delle pause pranzo e dei permessi dei dipendenti.

## Requisiti

- [Node.js](https://nodejs.org/) e [pnpm](https://pnpm.io/) installati sulla macchina.

## Avvio rapido

1. Installare le dipendenze con `pnpm install`.
2. Avviare l'applicazione in modalità sviluppo con `pnpm dev`.

I componenti principali si trovano nella cartella `src/`: i componenti React sono in `src/components` e le pagine in `src/pages`.

Per una build di produzione eseguire `pnpm build` e lanciare l'anteprima con `pnpm preview`.

## Utilizzo dell'APK

Il repository include una GitHub Action per creare automaticamente l'APK di release.

1. Genera una nuova release eseguendo `git tag v1.0.0 && git push origin v1.0.0` oppure avviando manualmente il workflow **Android Release** dalla sezione *Actions*.
2. Scarica l'APK dagli artefatti del workflow o dalla pagina della release su GitHub.
3. Copia il file sul dispositivo Android, abilita l'installazione da **origini sconosciute** e apri l'APK per installare l'app.

## Deploy con Docker

È possibile eseguire l'app in un container già pronto usando Docker Compose:

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
