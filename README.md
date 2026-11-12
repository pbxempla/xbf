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

## Deploying with environment variables

Configure these values in the frontend hosting environment:

- `PORT`: listening port (defaults to `3000`; set as a process environment
  variable, not in `.env`).
- `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL`: the deployed frontend URL,
  including `https://`.
- `NEXT_PUBLIC_API_URL`: the deployed backend API base URL, including
  `/api/v1`.
- `BETTER_AUTH_SECRET` and `DATABASE_URL`: the Better Auth secret and database
  connection string.

Set `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_API_URL` before running
`npm run build`; Next.js embeds `NEXT_PUBLIC_*` values into the client bundle
at build time. `npm start` serves the build on the configured `PORT`.

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
