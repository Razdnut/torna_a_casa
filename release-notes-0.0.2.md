## Torna a Casa v0.0.2

Questa release introduce un aggiornamento completo della supply-chain JavaScript/Capacitor e pubblica l'APK release aggiornato.

### APK
- Asset: `tornacasa.apk`
- Tipo: APK release **signed** (firma obbligatoria nella pipeline CI)

### Miglioramenti sicurezza
- Audit dipendenze portato a **0 vulnerabilità note** (`pnpm audit`).
- Aggiornato `react-router-dom` alla linea sicura 6.30.x per mitigare advisory su redirect/XSS.
- Aggiornati pacchetti Capacitor alla linea 7.5.x.
- Aggiornati pacchetti tooling che contribuivano ad advisory transitive.
- Inseriti override mirati per dipendenze transitive vulnerabili (glob/minimatch/tar/lodash/js-yaml/ajv/plugin-kit).

### Aggiornamenti principali
- `@capacitor/android`, `@capacitor/cli`, `@capacitor/core`, `@capacitor/ios` -> 7.5.0
- `react-router-dom` -> 6.30.3 (risoluzione lockfile)
- `recharts` -> 2.15.2
- `eslint` / `@eslint/js` -> 9.24.0
- `tailwindcss` -> 3.4.17

### Build e verifica
- Web build completata con successo.
- Sync Capacitor Android completato.
- Build Android release completata con successo (`assembleRelease`).

### Note operative
- I rilasci pubblici non devono distribuire APK unsigned.
- Se in futuro servirà pubblicazione Play Store, mantenere la firma release con keystore dedicato e protetto.