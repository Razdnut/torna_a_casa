# Welcome to your Dyad app

## Funzionalità

L'app calcola gli orari di lavoro, le pause pranzo e gestisce i permessi dei dipendenti.

## Avvio rapido

1. Installare le dipendenze con `pnpm install`.
2. Avviare l'applicazione in modalità sviluppo con `pnpm dev`.

I componenti principali si trovano nella cartella `src/`: i componenti React sono in `src/components` e le pagine in `src/pages`.

## Release Android

Il repository include una GitHub Action per creare automaticamente l'APK di release.

- Esegui `git tag v1.0.0 && git push origin v1.0.0` per generare una nuova release.
- In alternativa avvia manualmente il workflow **Android Release** dalla sezione *Actions*.
- Il file APK prodotto è allegato come artefatto e alla release GitHub.

