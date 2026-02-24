# iOS signing secrets for GitHub Actions

Per ottenere un file `tornacasa.ipa` installabile su iPhone con la workflow `mobile-release.yml`, devi configurare questi secrets nel repository:

- `IOS_CERTIFICATE_BASE64`
- `IOS_CERTIFICATE_PASSWORD`
- `IOS_PROVISION_PROFILE_BASE64`
- `IOS_TEAM_ID`

## 1) Prepara certificato e provisioning profile

- Crea/esporta da Apple Developer un certificato iOS Distribution in formato `.p12` (con password).
- Crea un provisioning profile **Ad Hoc** per il bundle id dell'app:
  - `com.example.radiantkookaburraswim`
- Assicurati che l'UDID del tuo iPhone sia incluso nel provisioning profile.

## 2) Converti i file in Base64

Su PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\ios_dist.p12")) | Set-Content cert.base64
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\profile.mobileprovision")) | Set-Content profile.base64
```

## 3) Salva i secrets nel repo GitHub

```powershell
$gh = "C:\Program Files\GitHub CLI\gh.exe"
& $gh secret set IOS_CERTIFICATE_BASE64 --repo Razdnut/torna_a_casa < cert.base64
& $gh secret set IOS_CERTIFICATE_PASSWORD --repo Razdnut/torna_a_casa
& $gh secret set IOS_PROVISION_PROFILE_BASE64 --repo Razdnut/torna_a_casa < profile.base64
& $gh secret set IOS_TEAM_ID --repo Razdnut/torna_a_casa
```

## 4) Esegui la workflow

- Workflow: `Mobile Release (APK + IPA)`
- Input consigliati:
  - `tag`: es. `0.0.3`
  - `release_title`: es. `Torna a Casa v0.0.3`
  - `release_notes`: opzionale

Output:
- `tornacasa.apk`
- `tornacasa.ipa`
pubblicati nella stessa GitHub Release.
