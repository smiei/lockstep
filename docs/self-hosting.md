# Self-hosting

[← Back to the README](../README.md)

The tracker is one small web server with a SQLite database. Run it wherever suits you, then open it from any browser on your network. Your phone, a friend's laptop and the PC next to the game can all have the same run open; changes show up on every device live.

- [Docker](#docker) — recommended for home servers (Unraid, Synology, a Raspberry Pi, any Linux box)
- [Pinokio](#pinokio) — one click on Windows, macOS or Linux
- [Without Docker](#without-docker) — plain Node.js
- [Updating](#updating) · [Backups](#backups) · [HTTPS and installing the app](#https-and-installing-the-app) · [Trainer pictures](#trainer-pictures) · [Custom app icon](#custom-app-icon-optional)

## Docker

The image is [`ghcr.io/smiei/lockstep`](https://github.com/smiei/lockstep/pkgs/container/lockstep) on GitHub's container registry.

It is built for `amd64` and `arm64`, so it runs on ordinary PCs and servers as well as on a Raspberry Pi 4 or 5 with a 64-bit OS, ARM-based NAS units and Apple Silicon Macs.

```yaml
# compose.yaml
services:
  lockstep:
    image: ghcr.io/smiei/lockstep:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:/app/db/nuzlocke.db
      # - DEFAULT_SHELL_COLOR=blue                  # optional: green (default), red, blue or yellow
      # - DEFAULT_LANGUAGE=en                       # optional: de, en, fr, es or it
    volumes:
      - db:/app/db                                  # your runs
      - sprites:/app/public/pokemon-sprites         # downloaded once, kept across updates
      - balls:/app/public/ball-sprites
      - badges:/app/public/badges
      - trainers:/app/public/trainers               # trainer pictures, see "Trainer pictures"
    restart: unless-stopped

volumes:
  db:
  sprites:
  trainers:
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
docker run -d --name lockstep -p 3000:3000 \
  -e DATABASE_URL=file:/app/db/nuzlocke.db \
  -v nuzlocke-db:/app/db -v nuzlocke-sprites:/app/public/pokemon-sprites \
  --restart unless-stopped ghcr.io/smiei/lockstep:latest
```

### Volumes (e.g. Unraid)

Most setups need these three mounts:

| Container path | Purpose |
| --- | --- |
| `/app/db` | SQLite database. **Required**, because this is your data. |
| `/app/public/pokemon-sprites` | Pokémon sprites, one subfolder per sprite set. **Recommended:** without it, every new container (each image update) downloads them again, which takes a few minutes. |
| `/app/public/trainers` | Trainer pictures. **Recommended:** downloaded on the first start and kept across updates; also where your own pictures go (see below). |

Everything else is optional and usually best left out:

| Container path | Purpose |
| --- | --- |
| `/app/public/ball-sprites` | Poké Ball item sprites. Small; downloaded on start if missing. |
| `/app/public/badges` | Gym badge icons. Small; downloaded on start if missing. |
| `/app/data` | Your own copy of the game data. The folder must hold a complete copy of the image's `data/`, because an empty mount hides the built-in data. Leave it out to use the data from the image. |
| `/app/branding` | Your own app icon (see below). |

> **Don't mount `/app/public` as a whole.** The folder also holds files that ship with the image and change with updates: the web app manifest, the service worker and the app icons.
> - **Host folder (Unraid):** it starts empty, so the app has no icons and can no longer be installed on a phone.
> - **Docker named volume:** Docker fills it only once, when the volume is created. After that, no image update reaches those files, without any error.
>
> Mount only the subfolders above.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | **Required.** `file:/app/db/nuzlocke.db` |
| `DEFAULT_SHELL_COLOR` | Optional. The colour every device starts with: `green` (default), `red`, `blue` or `yellow`. The browser-tab icon, the home-screen icon and the installed app's splash screen and status bar take this colour too. Anyone can still pick their own colour in the gear menu, which is kept per device. |
| `CUSTOM_GAMES_DIR` | Optional. Where games imported in the app are saved (default: `custom-games` next to the database, see [Backups](#backups)). |
| `TRAINER_SPRITES` | Optional. `off` skips the trainer-picture download (see [Trainer pictures](#trainer-pictures)). |
| `DEFAULT_LANGUAGE` | Optional. The language a **browser tab** starts in: `de`, `en`, `fr`, `es` or `it`. The **installed app** (home screen) follows the phone's language instead. Without this variable, browser tabs follow the device language too, with German as the last fallback. A language picked in the gear menu always wins. |

Light and dark mode follow the device until someone switches them by hand. Switching back to the mode the device itself uses makes the app follow the device again.

On Unraid, add each optional variable under **Add another Path, Port, Variable, Label or Device** → Config Type **Variable**: for example key `DEFAULT_SHELL_COLOR`, value `blue`.

The app listens on port `3000` inside the container.

### Image tags

Tags follow `MAJOR.MINOR`. `latest` always points at the newest release, and every release is also pushed under its own version, so a rollback is a one-word edit:

```
ghcr.io/smiei/lockstep:latest   →   ghcr.io/smiei/lockstep:5.0
```

### Moving from the old image name

Up to 4.3 the app was called SoulLink Nuzlocke Tracker and the image `gloryy/nuzlocke-tracker` on Docker Hub (also `ghcr.io/smiei/nuzlocke-tracker`). From 5.0 on only `ghcr.io/smiei/lockstep` gets new releases; Docker Hub gets none. To switch, change the image name and keep everything else - volumes, `DATABASE_URL`, ports. Your runs stay where they are, and the database is migrated on the first start. The old image stays available for rollbacks to 4.3 and earlier.

## Pinokio

[Pinokio](https://pinokio.co/) installs and starts apps with one click and brings its own Node.js and Git.

1. Install Pinokio. On its first start, pick a short home folder without spaces, such as `C:\pinokio`.
2. On the **Explore** page, paste `https://github.com/smiei/lockstep-pinokio` into the **GitHub or Hugging Face URL** field and click **Go**. Older versions call this **Download from URL** on the **Discover** page.
3. Click **Install**. If Pinokio asks to install **Coding (Essential)** (Git and Node.js), confirm it.
4. Click **Start**, then **Open Tracker**.

Not **Ask → Download → Import task**: that imports a Pinokio *task*, which is something different from an app.

Your runs are stored in the launcher's `data/nuzlocke.db`, outside the app folder, so Pinokio's **Update** and **Reset** never touch them. Details are in the [launcher's README](https://github.com/smiei/lockstep-pinokio).

## Without Docker

Requirements: [Node.js](https://nodejs.org/) 20.9 or newer (the current LTS is fine) and [Git](https://git-scm.com/).

```bash
git clone https://github.com/smiei/lockstep.git
cd lockstep
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

> **Windows:** keep the folder path short (for example `C:\lockstep`). The build writes some long file names, and a very deep folder can hit Windows' 260-character path limit.

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

Games imported in the app (New Run → *Import your own game*) are saved in a `custom-games` folder **next to the database**: in the `/app/db` volume, in Pinokio's `data/` folder, or in `prisma/` without Docker. Copy that folder along with the database. Run backups made in the app carry their custom game anyway. `CUSTOM_GAMES_DIR` moves the folder elsewhere.

## HTTPS and installing the app

The tracker works over plain `http://` on your network. Browsers only offer **Install app** (home-screen icon, full-screen, offline sprite cache) on `https://` addresses or on `localhost`. To install it on a phone, put the tracker behind HTTPS, for example with:

- a reverse proxy such as [Caddy](https://caddyserver.com/) or Nginx Proxy Manager with a certificate;
- [Tailscale](https://tailscale.com/) (`tailscale serve`), for access from your own devices anywhere;
- a [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/).

**Cloudflare Access:** if you protect the tracker with it, add **Bypass** rules for `/manifest.webmanifest`, `/icons/*` and `/sw.js`. Phones fetch those without your login cookie, and installing fails otherwise.

## Trainer pictures

The Journey tab shows a picture for every boss trainer. On the first start (Docker, Pinokio or `npm run setup`) the app downloads them from [Pokémon Showdown](https://play.pokemonshowdown.com/) into `public/trainers/`. Only missing files are fetched, so later starts cost nothing. The pictures are © Nintendo / GAME FREAK / The Pokémon Company and never enter the repository or the Docker image. Emerald's rival has none, because it depends on the player's gender.

**Your own pictures always win.** Put square PNGs into `public/trainers/`; with Docker, that is the folder mounted at `/app/public/trainers`. A file of yours is never overwritten, and a trainer with a picture of yours in the shared root folder gets nothing downloaded for any game. File names and folder layout are explained in [`public/trainers/README.txt`](../public/trainers/README.txt).

To skip the download entirely, set `TRAINER_SPRITES=off`. A read-only mount also leaves the folder alone. Without a picture, a trainer shows an initial-letter placeholder.

## Custom app icon (optional)

Mount a folder containing `icon.svg` (or `icon.png` / `.jpg` / `.webp`) at `/app/branding`. The container then replaces the app icon, home-screen icon and browser-tab icon with yours on start. The published image always ships the project's own icon.

The project logo follows the shell colour:
- the icons follow `DEFAULT_SHELL_COLOR`;
- the logo in the side rail follows each device's own choice.

An SVG logo of your own follows along wherever it uses the project logo's colours: tile `#0f3d30`, label `#dcebe1`, dots `#ffffff`. Any other colour in it stays as drawn.

**Icon for the Unraid Docker page:** in the container's **Advanced View**, set **Icon URL** to `http://<server-ip>:<port>/icons/icon-512.png`, which is the app's own icon, your logo included.
- Use the LAN address, because Unraid fetches the picture itself. Behind a login such as Cloudflare Access it would get the login page.
- Unraid caches the icon. Append `?v=2` after changing the logo.
