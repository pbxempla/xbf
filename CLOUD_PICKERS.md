# Import from Google Drive and Dropbox

The upload page shows "Google Drive" and "Dropbox" buttons when their keys are set in
`.env`. The chosen file is downloaded into the browser and then follows the normal
upload flow (local checks, preview, backend upload). Nothing is stored by these pickers and
no server is needed. All four values are public identifiers, not secrets. Restart
`npm run dev` after changing them, and delete `.next` if a value was built with an old one.

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_GOOGLE_API_KEY=
NEXT_PUBLIC_GOOGLE_APP_ID=
NEXT_PUBLIC_DROPBOX_APP_KEY=
```

## Google Drive (three values)

1. Open https://console.cloud.google.com and create or choose a project.
2. APIs & Services > Library: enable **Google Picker API** and **Google Drive API**.
3. APIs & Services > OAuth consent screen: choose External, fill in the app name and email,
   and add yourself as a test user while the app is in Testing. The only scope used is
   `drive.file` (files the user picks), so Google verification is not needed to publish.
4. APIs & Services > Credentials > Create credentials > **OAuth client ID** > Web application.
   Under Authorised JavaScript origins add `http://localhost:3000` and your production
   origin. No redirect URI is needed. Copy the Client ID into `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
5. Create credentials > **API key**. Restrict it to the Google Picker API and to HTTP
   referrers `http://localhost:3000/*` and your production origin. Copy it into
   `NEXT_PUBLIC_GOOGLE_API_KEY`.
6. `NEXT_PUBLIC_GOOGLE_APP_ID` is the numeric **project number** (Project settings, or the
   Dashboard "Project info" card), not the project ID.

## Dropbox (one value)

1. Open https://www.dropbox.com/developers/apps and click **Create app**.
2. Choose **Scoped access**, then **Full Dropbox** (or App folder to limit access), and name it.
3. On the app's Settings tab, under **Chooser / Saver / Embedder domains**, add
   `http://localhost:3000` and your production origin.
4. Copy the **App key** into `NEXT_PUBLIC_DROPBOX_APP_KEY`. The App secret is not used.
5. A new app is in development status (limited users). Apply for production on the app page
   before wider release.

## Troubleshooting

- A button is missing: its values are not set, or the dev server was not restarted.
- Google "origin_mismatch" or a blocked popup: the origin is not in the OAuth client's
  Authorised JavaScript origins, or the browser blocked the popup.
- Google "access blocked": the signed-in account is not a test user while the app is in Testing.
- Dropbox cannot download: the origin is missing from Chooser domains. Use Browse files instead.
- Google Sheets are exported as XLSX by Google, which limits exports to about 10 MB.
