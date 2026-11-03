# Straordinario (overtime) — design

Data: 2026-11-03 · Stato: bozza da rivedere

## Obiettivo

Permettere di dichiarare, giorno per giorno, che si farà straordinario; sapere a che ora uscire per farlo; vedere quanto straordinario è stato accumulato nel mese e confrontarlo con un obiettivo mensile.

## Regole di business (confermate)

1. Lo straordinario esiste **solo se il flag del giorno è attivo**.
2. Conta come straordinario solo se i minuti oltre le 7h12 (`TARGET` = 432) sono **≥ 60**. In quel caso conta **tutto** l'extra (75 min di extra = 75 min di straordinario). Sotto i 60 minuti non è straordinario.
3. Lo straordinario ha un **contatore separato** dal saldo credito/debito: quando conta, il credito di quel giorno è 0 e l'extra non entra nel saldo. Il debito non cambia.
4. Con flag attivo ma extra < 60 min: nessuno straordinario, l'extra segue la regola normale (va nel credito del saldo) e l'app mostra un avviso.
5. Il contatore è **mensile e senza riporto**: a fine mese viene liquidato in busta paga, quindi ogni mese riparte da zero. I mesi passati restano consultabili.
6. Con flag spento tutto resta come oggi.

## Dati

### `WorkDayRecord` (`src/types/worklog.ts`)

- `overtimeEnabled: boolean` (default `false`)
- `overtimePlannedMinutes: number` (default `0`; se il flag è attivo e il valore è 0 si usa 60). Valori validi: 60–360, interi.

`emptyDay()`, `normalizeRecord`, `entryToRecord` e il web store li gestiscono con i default, così i giorni già salvati continuano a funzionare.

### Database (`worklog-storage.ts`)

- Colonne nuove in `work_days`: `overtime_enabled INTEGER NOT NULL DEFAULT 0`, `overtime_planned INTEGER NOT NULL DEFAULT 0`.
- Migrazione per i database esistenti: all'avvio, se mancano le colonne, `ALTER TABLE work_days ADD COLUMN …` (controllo con `PRAGMA table_info`). Nessuna perdita di dati.
- `upsertPlainWorkDay`, `loadWorkDay`, `listWorkDays` e `restoreBackup` leggono e scrivono le colonne nuove.

### Obiettivo mensile

- Impostazione `overtime_goals` in `app_settings`: `{ "YYYY-MM": minuti }`, stessa struttura e stessa validazione di `monthly_balance_adjustments` (mese `YYYY-MM`, intero sicuro, massimo 1.000.000).
- Funzioni `getOvertimeGoals()` e `setOvertimeGoal(month, minutes | null)`.
- `clearAllWorklogData` la elimina già con `app_settings`.

### Backup (`backup-data.ts`)

- Nei giorni, `overtimeEnabled` e `overtimePlannedMinutes` sono opzionali con default.
- In `settings`, `overtimeGoals` è opzionale.
- Al ripristino gli obiettivi si fondono come le rettifiche del saldo: con `overwrite` vince il backup, senza vince il dato locale.
- La versione del backup resta 1: i backup vecchi si importano senza modifiche.

## Calcolo (`src/lib/day-summary.ts`, nuovo `src/lib/overtime.ts`)

- `OVERTIME_MIN = 60`, `OVERTIME_MAX_PLANNED = 360`.
- `summarizeDay` aggiunge `overtime`: se `overtimeEnabled` e `worked − TARGET ≥ OVERTIME_MIN` allora `overtime = worked − TARGET` e `credit = 0`; altrimenti `overtime = 0` e `credit` come oggi.
- `calculateRecord` e `WorkDayCalculated` espongono `overtime`.
- `todayState` somma `overtimePlannedMinutes` (se flag attivo) a `exit`: `start + TARGET + pause + permit + planned`.
- `overtimeWarning(record, nowMinutes)` restituisce un testo oppure `null`:
  - flag attivo e uscita registrata che dà extra < 60 min → «Non stai facendo il minimo di 1 ora per lo straordinario. Queste ore finiscono nel saldo, non nello straordinario.»;
  - flag attivo e ore previste < 60 → errore di validazione sul campo;
  - nessun avviso se il flag è spento o se l'uscita non è ancora registrata.
- `dayIssues` accetta i valori validi del selettore (60–360) e segnala quelli fuori intervallo.
- `buildMonthReport` aggiunge `overtime` ai totali; ogni riga ha `totals.overtime`.
- Nuovo `src/lib/overtime-month.ts` (o funzione in `month-report.ts`): `calculateOvertimeMonth(month, days, leaves, goals)` → `{ month, done, goal, remaining, reached }`. Nessun riporto tra mesi.

## Interfaccia

### Tracker (`WorkTimeTracker.tsx`)

- Checkbox «Oggi faccio straordinario» (`overtimeEnabled`).
- Se attiva compare «Straordinario previsto» con due campi, **ore** (0–6) e **minuti** (0–59), con totale minimo 1h00 e massimo 6h00. Valore iniziale 1h00.
- Sotto il campo: «Per fare 2h 15m di straordinario devi uscire alle HH:MM», calcolato come l'ipotesi di uscita attuale + il previsto.
- L'avviso di `overtimeWarning` compare accanto a «Ipotesi orario uscita» e nel riepilogo del giorno.
- Il salvataggio e l'autosalvataggio includono i due campi nuovi.

### Home (`Index.tsx`)

- La card «Oggi puoi uscire alle» include lo straordinario previsto, con la nota «Include 2h 15m di straordinario».
- Una scheda compatta «Straordinario del mese»: fatto / obiettivo e link all'Archivio.
- Il bottone «Registra uscita» resta identico. L'avviso compare se, quando si registra l'uscita, l'extra è < 60 min.
- Il flag e le ore previste di oggi si impostano dal tracker, non dalla home (nessuna azione nuova).

### Archivio (`HistoryPage.tsx`)

- Nuovo `OvertimeCard.tsx` accanto a `MonthlyBalanceCard`, con lo stesso mese selezionato:
  - ore di straordinario fatte nel mese;
  - obiettivo con modifica (ore + minuti, Salva e «Rimuovi obiettivo»);
  - barra di avanzamento e «mancano Xh Ym» oppure «Obiettivo raggiunto»;
  - nota «Il contatore riparte da zero ogni mese».
- Colonna «Straordinario» nella tabella giornaliera del mese.

### Report

- CSV e PDF: colonna «Straordinario (min)» e riga di totale.

## Test (`pnpm test`)

Nuovo `src/lib/overtime.test.ts`, aggiunto allo script `test` in `package.json`:

- soglia: 59 min → nessuno straordinario e credito normale; 60 min → straordinario 60 e credito 0; 75 min → 75;
- flag spento: invariato rispetto a oggi;
- combinazioni con pausa effettiva, `pauseNoExit` e permessi;
- uscita consigliata con straordinario previsto, ore e minuti (per esempio 1h30);
- avviso con extra < 60 e assenza di avviso negli altri casi;
- totale mensile, nessun riporto, obiettivo raggiunto e mancanti;
- il saldo mensile non cambia con lo straordinario;
- backup vecchio (senza campi nuovi) importato senza errori; backup nuovo con round-trip;
- validazione del selettore (59 min e 361 min respinti).

## Fuori ambito

Retribuzione dello straordinario, tetto massimo mensile, riporto del contatore, notifiche.

## Rilascio

Versione 1.7.0, note di rilascio e sezione nei README (it/en).
