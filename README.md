# Comabooru

**Comabooru** is a modern, fast, and elegant Single Page Application (SPA) client for Booru imageboard platforms (including Gelbooru). It is built with **Svelte 5**, **Vite**, and **TypeScript**, focusing on premium UI/UX design, dark modes, quality-of-life (QoL) features, and high performance.

> ℹ️ **Disclaimer & Content Policy**  
> Comabooru is developed strictly for discovering, browsing, and curating **Safe For Work (SFW) digital art, anime illustrations, and high-quality aesthetic artwork**. The author does not use this software for explicit/NSFW content and focuses exclusively on visual design and clean artwork. The client includes robust built-in rating filters and tag blacklisting tools to enforce SFW browsing across third-party Booru APIs.

---

## ✨ Features

- **🔒 Auth & Multi-Board Management**:
  - Quick onboarding with instant account validation via test API requests.
  - Dual-layer credential storage (`localStorage` + `SameSite=Strict` cookies).
  - Multi-board support allowing seamless switching between different Booru API endpoints.
- **🖼 Gallery & Lightbox Viewer**:
  - Fluid, responsive grid layout supporting multiple view densities (`compact`, `comfortable`, `masonry`).
  - High-performance media viewing for images and videos (`.mp4`, `.webm`, `.gif`).
  - Fullscreen Lightbox mode with 1-click downloads and quick links to original source posts.
  - Comprehensive keyboard navigation (`←` / `→` or `A` / `D` for browsing, `S` to download, `Esc` to close).
- **🏷 Smart Tagging & Autocomplete**:
  - Real-time search with 200ms debounce and dynamic tag suggestions.
  - Color-coded tag categories (`artist`, `copyright`, `character`, `meta`, `general`).
  - Interactive search tag chips with easy removal.
- **🛡 Blacklist & Customization**:
  - Instant client-side filtering powered by a customizable tag blacklist.
  - Fast tag blacklisting directly from the Lightbox overlay.
  - Multiple aesthetic themes: **Dark**, **Light**, and **OLED Black**.
  - Configurable Referrer Policy (`no-referrer` to bypass CDN hotlinking restrictions).
  - Custom Proxy Fallback support for avoiding CORS or network issues.

---

## 🛠 Tech Stack

- **Framework**: [Svelte 5](https://svelte.dev/) (Svelte Runes)
- **Bundler**: [Vite 8](https://vitejs.dev/)
- **Language**: [TypeScript 6](https://www.typescriptlang.org/)
- **Runtime & Package Manager**: [Bun](https://bun.sh/)
- **Icons**: [Lucide Svelte](https://lucide.dev/)
- **Testing**: [Vitest](https://vitest.dev/)

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
bun install
```

### 2. Start Development Server

```bash
bun run dev
```

The application will be running at `http://localhost:5173`.

### 3. Type Checking & Code Quality

```bash
# Check Svelte components and TypeScript types:
bun run check

# Lint codebase with ESLint:
bun run lint

# Automatically fix linting issues:
bun run lint:fix
```

### 4. Run Unit Tests

```bash
bun run test
```

### 5. Production Build

```bash
bun run build
```

Compiled static assets will be output to the `dist/` directory.

---

## 📦 Continuous Integration & Deployment

The repository includes an automated GitHub Actions pipeline at [.github/workflows/deploy.yml](.github/workflows/deploy.yml). When changes are pushed to the `main` branch, the workflow automatically runs type checks, ESLint, Vitest unit tests, builds static assets, and deploys via `rsync`.

### 1. GitHub Repository Secrets

Add the following secrets under **Settings** ➔ **Secrets and variables** ➔ **Actions**:

| Secret | Description | Example |
| :--- | :--- | :--- |
| `DEPLOY_HOST` | Target server domain or IP address | `192.168.1.100` |
| `DEPLOY_PORT` | SSH port | `22` |
| `DEPLOY_USER` | SSH user | `root` or `deploy` |
| `DEPLOY_KEY` | Private SSH key (OpenSSH format) | `-----BEGIN OPENSSH PRIVATE KEY----- ...` |
| `DEPLOY_PATH` | Server web root directory path | `/var/www/comabooru` |

---

### 2. Production Deployment (Bun Server + Nginx)

For production, Comabooru runs as a fully-featured Node/Bun application. The `server.ts` handles serving static SPA files and dynamically proxies Booru APIs to bypass CORS and CDN hotlinking restrictions.

1. Create a `systemd` service to keep the process running reliably in the background.
Create a file at `/etc/systemd/system/comabooru.service`:

```ini
[Unit]
Description=Comabooru Bun Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/comabooru
ExecStart=/usr/local/bin/bun run server.ts
Environment=PORT=3101
Environment=NODE_ENV=production
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now comabooru
```

2. Configure Nginx to act as a simple reverse proxy (`/etc/nginx/sites-available/comabooru`):

```nginx
server {
    listen 80;
    server_name comabooru.yourdomain.com; # Your domain or IP

    location / {
        proxy_pass http://localhost:3101;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the configuration and reload Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/comabooru /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 📁 Project Structure

```text
comabooru/
├── .github/
│   └── workflows/
│       └── deploy.yml   # GitHub Actions deployment pipeline
├── src/
│   ├── lib/
│   │   ├── api/          # Booru API integration and types
│   │   ├── components/   # UI components (Auth, Gallery, Search, Common)
│   │   ├── services/     # Svelte 5 state management services
│   │   ├── styles/       # Global CSS tokens and glassmorphic styling
│   │   └── utils/        # Storage handlers and tag parsing utilities
│   ├── App.svelte        # Root application component
│   └── main.ts           # Vite entry point
├── tests/
│   └── unit/             # Unit tests (API, storage, tag parser, components)
├── LICENSE               # MIT License
└── vite.config.ts        # Vite & Vitest configuration
```

---

## 📜 License

[MIT](LICENSE)
