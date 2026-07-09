# WhatsApp Wrapped

An interactive archive for WhatsApp chat exports. Users upload a `.txt` or `.zip`
export, the browser parses the chat locally, and the app builds:

- A Wrapper card deck with stats, quotes, moments, and awards
- A walkable museum for each chat
- An Archive District where multiple chat museums live together
- Optional account storage for derived results only

Raw messages are not stored. Guest archives live in localStorage. Signed-in
archives store derived stats and generated recap data.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

Create `.env.local`:

```bash
ANTHROPIC_API_KEY=...
DATABASE_URL=postgres://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ALLOW_MOCK_ANALYSIS=false
```

For Vercel production, set:

- `ANTHROPIC_API_KEY`
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_APP_URL`

Use the deployed HTTPS origin for both URL values.
Keep `NEXT_PUBLIC_ALLOW_MOCK_ANALYSIS=false` in production so failed analysis
does not generate fake recaps.

## Checks

```bash
npm run lint
npm run build
npx tsx scripts/test-parser.mjs
```

## Privacy Model

- Parsing and stat calculation happen in the browser.
- Uploaded zip media is used only for session-only object URLs.
- Raw transcript text is sent to the analysis API for recap generation.
- The app stores only derived results when the user is signed in.
- Guest results remain in browser localStorage.

Do not commit real WhatsApp exports or media.
