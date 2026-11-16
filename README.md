This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
Next.js uses `PORT` from the process environment for its listening port
(default `3000`). Set it in the hosting platform or shell, not `.env`, since
Next.js reads it before loading `.env`.

Before testing authentication locally, copy `.env.example` to `.env` in this
frontend directory and set `DATABASE_URL` to a Node `pg` connection string, for
example `postgresql://USER:PASSWORD@HOST:5432/xempla_brief`. Replace the
placeholders with your database credentials and host. Do not use the
SQLAlchemy-specific `postgresql+psycopg2://` scheme; restart the dev server
after changing environment variables.

## Upload file security checks

The upload page performs file-format and suspicious-content checks locally in
the browser before sending the selected file. The file is sent only after local
mandatory checks pass and any local warnings are acknowledged. The upload
request goes to the same-origin `/api/backend/uploads` proxy, which verifies
the Better Auth session and signs the backend identity assertion; browser code
does not receive or send user IDs or backend credentials. The proxy forwards
the multipart stream to FastAPI's `POST /api/v1/uploads` endpoint.

The backend is the final authority. The browser only enables mapping after a
valid backend response confirms `validation_status` is `passed` or `warning`
and `quarantine_status` is `quarantined`. Backend warnings require a separate
acknowledgement. Rejected or malformed responses, HTTP errors, network errors,
and timeouts do not advance the workflow. Backend findings are shown on the
upload page. Accepted upload ID and validation details are retained with the
local preview for the mapping page.

Backend quarantine is available, but there is not yet a backend column-mapping
or processing endpoint. The mapping page currently displays the local preview
and reports this integration boundary; it does not claim that backend
processing has occurred. Pre-upload inspection does not send the file to the
backend, S3, or third-party scanning services. Neither frontend nor backend
checks are an antivirus scan or guarantee that a file is malware-free.

Configure `NEXT_PUBLIC_ALLOWED_FILE_EXTENSIONS` (default `.csv,.xls,.xlsx`)
and `NEXT_PUBLIC_MAX_FILE_SIZE_MB` (default `100`) in the frontend `.env`.
These `NEXT_PUBLIC_*` values are exposed to browser users and embedded in the
client build; they are public configuration and must never contain secrets.
Only CSV, legacy XLS, and XLSX are implemented formats; unsupported formats in
the extension list are ignored. Restart the Next.js server after changing the
values.

For automated verification, run `npm run test:upload-security`. For a real
integration test, apply the backend migrations, start FastAPI and Next.js with
matching `AUTH_BRIDGE_SECRET` values and a reachable `BACKEND_API_URL`, then
sign in with a verified Better Auth session. Select valid CSV/XLS/XLSX samples
and confirm the browser inspection completes before any upload request is
made. Acknowledge local warnings if present, choose **Upload and validate**,
and confirm the Network panel shows a multipart POST to
`/api/backend/uploads` (the proxy forwards `file` to `/api/v1/uploads`).
Confirm accepted backend results and findings are displayed and mapping remains
blocked until backend warnings are acknowledged. Test expired sign-in,
unsupported/oversized files, malformed samples, network failure, and backend
unavailability; none should navigate to mapping. A successful upload is
quarantined and does not imply server-side mapping or processing.

## Deploying with environment variables

Configure these values in the frontend hosting environment:

- `PORT`: listening port (defaults to `3000`; set as a process environment
  variable, not in `.env`).
- `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL`: the deployed frontend URL,
  including `https://`.
- `BACKEND_API_URL`: the private FastAPI base URL, including `/api/v1`.
- `AUTH_BRIDGE_SECRET`: a randomly generated secret of at least 32 characters;
  configure the same value in the backend, and never expose it with a
  `NEXT_PUBLIC_` prefix.
- `BETTER_AUTH_SECRET` and `DATABASE_URL`: the Better Auth secret and database
  connection string.

Set `NEXT_PUBLIC_APP_URL` before running
`npm run build`; Next.js embeds `NEXT_PUBLIC_*` values into the client bundle
at build time. `npm start` serves the build on the configured `PORT`.

## Authentication and profile integration

Better Auth is the sole authentication authority. Its PostgreSQL `user` and
`session` records are not copied into a second authentication system. After
Better Auth validates the HttpOnly session cookie, the Next.js
`/api/backend/*` server route issues a 60-second HS256 identity assertion to
FastAPI. Browser code never receives that assertion or a Better Auth session
token. The backend verifies the signature, issuer, audience, expiry, and
verified-email claim on every request.

Use the same PostgreSQL database for Better Auth and FastAPI, and apply the
Better Auth schema before testing the flow. Apply the backend-owned tables and
profile-link migration from `xempla-brief-backend` with `alembic upgrade head`.
The backend profile is linked by the Better Auth user ID; email classification,
the current credit balance, and credit transactions remain backend-owned. New
Better Auth identities receive a server-only credit eligibility marker, while
legacy balances are imported once by FastAPI to avoid duplicate signup
credits. Profile and credit data in the upload header come from FastAPI, not
browser-side estimates.

The bridge secret must be identical in both server environments. The API
should be reachable from the Next.js server at `BACKEND_API_URL`; browser
requests go to the same-origin Next.js proxy, not directly to FastAPI.

## Check Google Workspace SMTP

Set `XEMPLA_MAIL_SERVER=smtp.gmail.com`, `XEMPLA_MAIL_PORT=587`, and
`XEMPLA_MAIL_SSL=false` in `.env`. Set `XEMPLA_USE_CREDENTIALS=true` and provide
the Workspace account in `XEMPLA_MAIL_USERNAME` and its app password in
`XEMPLA_MAIL_PASSWORD`. Alternatively, use port `465` with
`XEMPLA_MAIL_SSL=true`. `XEMPLA_MAIL_FROM` should be an address permitted to
send from that Workspace account.

Run `npm run smtp:check` to validate the settings and verify the SMTP
connection/authentication. The check does not send an email or print credentials.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
