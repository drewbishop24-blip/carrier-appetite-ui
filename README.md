
# Carrier Appetite Finder UI (Vercel)

Modern React UI (Vite + Tailwind) that reads/writes carrier appetite data from Google Sheets via an Apps Script Web App API.

## Environment variable
Set `VITE_API_BASE` to your Apps Script deployment **/exec** URL.

Example:
```bash
VITE_API_BASE=https://script.google.com/macros/s/AKfycb....../exec
```

## Local run
```bash
npm install
cp .env.example .env
# edit .env and set VITE_API_BASE
npm run dev
```

## Deploy to Vercel
1) Push this folder to GitHub as a repo
2) Vercel → New Project → Import repo
3) Add Environment Variable: `VITE_API_BASE`
4) Deploy

## API sanity checks
Open in browser:
- `YOUR_EXEC_URL?action=classCodes`
- `YOUR_EXEC_URL?action=carriers`
- `YOUR_EXEC_URL?action=search&classCode=C-10`

If you open the API base URL with no query params, it will respond:
`{ "ok": false, "error": "Unknown action" }`
That’s normal.

## Admin key
The Admin page prompts you for the Apps Script `ADMIN_KEY`.
It is stored only in your browser localStorage after first save (not embedded in code).
