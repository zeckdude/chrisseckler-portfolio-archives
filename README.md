# chrisseckler-portfolio-archives

Frozen static snapshots of past portfolio sites. Each year lives in its own folder and deploys to its own subdomain (e.g. `2024.archive.chrisseckler.com`).

| Folder | Live source | Subdomain (planned) |
| --- | --- | --- |
| `2024/` | [chrisseckler-portfolio-site](https://github.com/zeckdude/chrisseckler-portfolio-site) | `2024.archive.chrisseckler.com` |

The gallery on the new portfolio (`chrisseckler.com/archive`) links here in new tabs.

## Structure

```
2024/           Static HTML, CSS, JS, images — no server, no database
2016/           (future) older portfolio versions as you recover them
scripts/        Regeneration tools (not deployed)
```

## Regenerate the 2024 snapshot

Requires the source repo cloned next to this one (`../chrisseckler-portfolio-site`) with a working `.env` (Notion API key + links database ID).

```bash
npm install
npm run freeze:2024
```

Notion `/links` data is baked into HTML at freeze time. Later Notion edits will not appear on the archive.

## Deploy to Vercel

Create a Vercel project from this repo with **Root Directory** set to `2024`. Attach `2024.archive.chrisseckler.com`.

When adding another year, create a separate Vercel project with Root Directory set to that year (e.g. `2016/`).
