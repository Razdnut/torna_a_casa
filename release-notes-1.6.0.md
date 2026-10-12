## Novità della versione 1.6.0

- **Saldo mensile modificabile:** nell’Archivio puoi impostare manualmente credito o debito in ore e minuti. La differenza rispetto alle giornate viene conservata come rettifica, con la possibilità di ripristinare il calcolo automatico.
- **Riporto tra mesi:** il saldo disponibile comprende il riporto dei mesi precedenti e passa automaticamente al mese successivo, anche nei mesi senza registrazioni.
- **Reset annuale:** il riporto si azzera a gennaio. I saldi e le rettifiche degli anni precedenti restano consultabili nello storico.
- Dashboard e calendario mostrano il saldo disponibile; CSV e PDF includono riporto, rettifica manuale e saldo finale.
- Le rettifiche mensili sono persistenti su web e Android e incluse nel backup completo. I backup delle versioni precedenti restano importabili.
- Aggiornamenti delle dipendenze riconciliati con la versione 1.5.0, pnpm unificato nelle build web, Android e Docker.

### Come modificare il saldo

Apri **Archivio → Modifica saldo del mese**, scegli Credito o Debito e inserisci ore e minuti. Il valore riguarda il mese selezionato, senza riporto; il saldo disponibile aggiunge il riporto precedente. Se modifichi successivamente le giornate, la rettifica resta e il saldo si aggiorna.

### Download Android

Installa **torna-a-casa-1.6.0.apk** come aggiornamento della versione precedente. La release include l’APK firmato e il checksum SHA-256.
