# opencode-image

> **Third-party community image.** This is an unofficial, community-maintained Docker image of [opencode](https://github.com/anomalyco/opencode). It is not affiliated with or endorsed by the opencode project.

A minimal Docker image that runs opencode with its built-in web UI (`opencode web`), usable directly with Docker or inside a [MicroSandbox](https://github.com/microsandbox/microsandbox) microVM.

The image is published to GHCR by CI: `ghcr.io/ctxinf/opencode-image` 

## 1. Run with Docker

Quick throwaway run:

```bash
docker run --rm -p 7777:7777 ghcr.io/ctxinf/opencode-image:latest
```

Open http://localhost:7777.

For a persistent deployment use compose (`docker/docker-compose.yml`):

```yaml
services:
  opencode:
    image: ghcr.io/ctxinf/opencode-image:latest
    container_name: opencode
    ports:
      - "7777:7777"
    environment:
      # Without a password opencode logs "server is unsecured" and the web UI
      # is open to anyone who can reach the port. Set it for any real deployment.
      - OPENCODE_SERVER_PASSWORD=${OPENCODE_SERVER_PASSWORD:-}
    volumes:
      - opencode-config:/root/.config/opencode
      - opencode-data:/root/.local/share/opencode
      - workspace:/workspace
    restart: unless-stopped

volumes:
  opencode-config:
  opencode-data:
  workspace:
```

```bash
cd docker
OPENCODE_SERVER_PASSWORD=change-me docker compose up -d
```

The three named volumes persist across restarts:

| Volume | Mount | Purpose |
|---|---|---|
| `opencode-config` | `/root/.config/opencode` | opencode config (seeded from the image) |
| `opencode-data` | `/root/.local/share/opencode` | sessions / auth / state |
| `workspace` | `/workspace` | your project files |

The baked-in config (`docker/config/opencode.jsonc`) disables sharing, auto-update, LSP and telemetry. API keys are entered in the web UI, not baked into the image.

## 2. Run in MicroSandbox

[`example/microsandbox-run.ts`](example/microsandbox-run.ts) starts the GHCR image in a microVM like `docker run --rm` — the sandbox lives as long as the script:

```bash
npm install
npm run sandbox            # -> http://localhost:17777
npm run sandbox -- 18000   # custom host port
```

Override the image with `OPENCODE_IMAGE=...` if needed.

## 3. Build locally (optional)

Only needed if you want to change the image itself:

```bash
cd docker
docker build -t opencode-image:latest .
# pin a different opencode version:
docker build --build-arg OPENCODE_VERSION=1.15.12 -t opencode-image:latest .
```

The Dockerfile downloads the opencode release tarball at build time — no binaries are checked into the repo.

## CI

- **docker-image.yml** — on push to `main` (touching `docker/`), tags `v*`, or manual dispatch: builds and pushes `ghcr.io/ctxinf/opencode-image` with `latest`, semver, and commit-SHA tags.
- **check.yml** — type-checks the TypeScript example with the TypeScript 7 preview (`tsgo --noEmit`).

## Repo layout

```
docker/
  Dockerfile               # debian:bookworm + opencode binary, CMD = opencode web
  docker-compose.yml       # persistent deployment with named volumes
  config/opencode.jsonc    # default opencode config baked into the image
example/
  microsandbox-run.ts      # minimal MicroSandbox launcher
.github/workflows/         # GHCR image publish + type check
```
