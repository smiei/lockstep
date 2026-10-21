# Self-hosting

[← Back to the README](../README.md)

The tracker is one small web server with a SQLite database. Run it wherever suits you, then open it from any browser on your network. Your phone, a friend's laptop and the PC next to the game can all have the same run open; changes show up on every device live.

- [Docker](#docker) — recommended for home servers (Unraid, Synology, a Raspberry Pi, any Linux box)
- [Pinokio](#pinokio) — one click on Windows, macOS or Linux
- [Without Docker](#without-docker) — plain Node.js
- [Updating](#updating) · [Backups](#backups) · [HTTPS and installing the app](#https-and-installing-the-app) · [Trainer pictures](#trainer-pictures-optional) · [Custom app icon](#custom-app-icon-optional)

## Docker

The image is [`gloryy/nuzlocke-tracker`](https://hub.docker.com/r/gloryy/nuzlocke-tracker).

```yaml
# compose.yaml
services:
  nuzlocke-tracker:
    image: gloryy/nuzlocke-tracker:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:/app/db/nuzlocke.db
    volumes:
      - db:/app/db                                  # your runs
      - sprites:/app/public/pokemon-sprites         # downloaded once, kept across updates
      - balls:/app/public/ball-sprites
      - badges:/app/public/badges
      # - ./trainers:/app/public/trainers:ro        # optional, see "Trainer pictures"
    restart: unless-stopped

volumes:
  db:
  sprites:
  balls:
  badges:
```

```bash
docker compose up -d
```

Then open `http://<your-server>:3000`.

On the first start the container downloads the Pokémon sprites and badge icons, which needs internet access once and takes a few minutes. The image itself deliberately contains no Pokémon artwork. Database migrations run automatically on every start.

**Without Compose:**

```bash
docker run -d --name nuzlocke-tracker -p 3000:3000 \
  -e DATABASE_URL=file:/app/db/nuzlocke.db \
  -v nuzlocke-db:/app/db -v nuzlocke-sprites:/app/public/pokemon-sprites \
  --restart unless-stopped gloryy/nuzlocke-tracker:latest
```

### Volumes (e.g. Unraid)

| Container path | Purpose |
| --- | --- |
| `/app/db` | SQLite database. **Required** — this is your data. |
| `/app/public/pokemon-sprites` | Pokémon sprites, one subfolder per sprite set. Filled automatically on start with whatever the game packs need. Recommended, so they survive image updates. |
| `/app/public/ball-sprites` | Poké Ball item sprites. Filled automatically; optional. |
| `/app/public/badges` | Gym badge icons. Filled automatically; optional. |
| `/app/public/trainers` | Your own trainer pictures (optional, see below). |
| `/app/data` | Override for the game data (optional; leave it out to use the data built into the image). |
| `/app/branding` | Your own app icon (optional, see below). |

The only required environment variable is `DATABASE_URL=file:/app/db/nuzlocke.db`. The app listens on port `3000` inside the container.

### Image tags

Tags follow `MAJOR.MINOR`. `latest` always points at the newest release, and every release is also pushed under its own version, so a rollback is a one-word edit:

```
gloryy/nuzlocke-tracker:latest   →   gloryy/nuzlocke-tracker:3.0
```

## Pinokio

[Pinokio](https://pinokio.co/) installs and starts apps with one click and brings its own Node.js and Git.

1. Install Pinokio. On its first start, pick a short home folder without spaces, such as `C:\pinokio`.
2. On the **Explore** page, paste `https://github.com/smiei/nuzlocke-tracker-pinokio` into the **GitHub or Hugging Face URL** field and click **Go**. Older versions call this **Download from URL** on the **Discover** page.
3. Click **Install**. If Pinokio asks to install **Coding (Essential)** (Git and Node.js), confirm it.
4. Click **Start**, then **Open Tracker**.

Not **Ask → Download → Import task**: that imports a Pinokio *task*, which is something different from an app.

Your runs are stored in the launcher's `data/nuzlocke.db`, outside the app folder, so Pinokio's **Update** and **Reset** never touch them. Details are in the [launcher's README](https://github.com/smiei/nuzlocke-tracker-pinokio).

## Without Docker

Requirements: [Node.js](https://nodejs.org/) 20.9 or newer (the current LTS is fine) and [Git](https://git-scm.com/).

```bash
git clone https://github.com/smiei/nuzlocke_tracker.git
cd nuzlocke_tracker
npm install
npm run setup
npm start
```

Then open [http://localhost:3000](http://localhost:3000). Other devices on your network use this computer's IP address with port 3000.

`npm run setup` does everything the Docker image would do:
- creates `.env`;
- sets up the database at `prisma/dev.db`;
- downloads the sprites and badges (once, a few minutes);
- builds the app.

It is safe to run again at any time.

Other ports: `npm start -- -p 4000`. To keep the tracker running after you close the terminal, use a process manager such as [pm2](https://pm2.keymetrics.io/) (`pm2 start npm --name nuzlocke -- start`) or a system service.

> **Windows:** keep the folder path short (for example `C:\nuzlocke_tracker`). The build writes some long file names, and a very deep folder can hit Windows' 260-character path limit.

## Updating

| Installed with | Update |
| --- | --- |
| Docker Compose | `docker compose pull && docker compose up -d` |
| Unraid | "Check for updates" / "Force update" on the container |
| Pinokio | **Update** in the launcher menu |
| Without Docker | `git pull`, `npm install`, `npm run setup`, then restart `npm start` |

Database migrations are applied automatically in every case. Existing runs are never touched.

## Backups

The easiest backup is in the app itself: gear menu → **Back up all runs**. It downloads a file that **Import backup** turns back into runs on any instance, without overwriting what is already there.

For a file-level backup, copy the database while the tracker is stopped:

| Installed with | Database file |
| --- | --- |
| Docker | `nuzlocke.db` in the volume mounted at `/app/db` |
| Pinokio | `data/nuzlocke.db` in the launcher folder |
| Without Docker | `prisma/dev.db` |

## HTTPS and installing the app

The tracker works over plain `http://` on your network. Browsers only offer **Install app** (home-screen icon, full-screen, offline sprite cache) on `https://` addresses or on `localhost`. To install it on a phone, put the tracker behind HTTPS, for example with:

- a reverse proxy such as [Caddy](https://caddyserver.com/) or Nginx Proxy Manager with a certificate;
- [Tailscale](https://tailscale.com/) (`tailscale serve`), for access from your own devices anywhere;
- a [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/).

**Cloudflare Access:** if you protect the tracker with it, add **Bypass** rules for `/manifest.webmanifest`, `/icons/*` and `/sw.js`. Phones fetch those without your login cookie, and installing fails otherwise.

## Trainer pictures (optional)

The Journey tab can show a picture for every boss trainer. There is no freely licensed source for them, so none are included; without one, an initial-letter placeholder is shown.

Put your own square PNGs into `public/trainers/`. With Docker, mount a folder at `/app/public/trainers`. File names and folder layout are explained in [`public/trainers/README.txt`](../public/trainers/README.txt).

## Custom app icon (optional)

Mount a folder containing `icon.svg` (or `icon.png` / `.jpg` / `.webp`) at `/app/branding`. The container then replaces the app icon, home-screen icon and browser-tab icon with yours on start. The published image always ships the project's own icon.
