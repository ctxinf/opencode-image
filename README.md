# opencode-image

Build a minimal Docker image that runs [opencode](https://github.com/anomalyco/opencode) with its built-in web UI, then run it either directly with Docker or inside a [MicroSandbox](https://github.com/microsandbox/microsandbox) microVM — one isolated, persistent opencode environment per project.

## What's inside

```
docker/
  Dockerfile               # debian:bookworm + opencode binary, CMD = opencode web
  docker-compose.yml       # local run with named volumes (config / data / workspace)
  config/opencode.jsonc    # default opencode config baked into the image
src/
  run-sandbox.ts           # spin up the image in a MicroSandbox VM per projectId
docs/
  push-to-local-registry.md  # push the image to a local registry for MicroSandbox
.github/workflows/
  docker-image.yml         # build & push image to GHCR
  check.yml                # tsgo type check
```

## 1. Build the image

```bash
cd docker
docker build -t opencode-env:latest .
# or pin a different opencode version:
docker build --build-arg OPENCODE_VERSION=1.15.12 -t opencode-env:latest .
```

The Dockerfile downloads the opencode release tarball at build time — no binaries are checked into the repo.

## 2. Run with Docker

```bash
cd docker
docker compose up -d --build
```

Open http://localhost:7777. Three named volumes persist across restarts:

| Volume | Mount | Purpose |
|---|---|---|
| `opencode-config` | `/root/.config/opencode` | opencode config (seeded from the image) |
| `opencode-data` | `/root/.local/share/opencode` | sessions / auth / state |
| `workspace` | `/workspace` | your project files |

The default config (`docker/config/opencode.jsonc`) disables sharing, auto-update, LSP and telemetry. API keys are entered in the web UI, not baked into the image.

## 3. Run in MicroSandbox

MicroSandbox pulls images from an OCI registry (it does not read the local Docker daemon cache), so first push the image to a local registry — see [docs/push-to-local-registry.md](docs/push-to-local-registry.md).

Then:

```bash
npm install

# npx tsx src/run-sandbox.ts [projectId] [hostPort]
npm run sandbox -- my-project 17777
```

The script:

1. Creates (or reuses) three named volumes scoped to the `projectId`.
2. Creates (or reconnects to) a detached sandbox named `opencode-${projectId}` with egress allowed and the web port bound to the host.
3. Starts `opencode web` and prints the URL: `http://localhost:17777`.

The sandbox keeps running after the script exits. Stop it with `msb stop opencode-<projectId>`.

Use `OPENCODE_IMAGE` to override the image reference (default `localhost:5000/opencode-env:latest`), e.g. the GHCR image published by CI:

```bash
OPENCODE_IMAGE=ghcr.io/<owner>/opencode-env:latest npm run sandbox -- my-project
```

## CI

- **docker-image.yml** — on push to `main` (touching `docker/`), tags `v*`, or manual dispatch: builds the image and pushes it to `ghcr.io/<owner>/opencode-env` with `latest`, semver, and commit-SHA tags.
- **check.yml** — type-checks `src/` with the TypeScript 7 preview (`tsgo --noEmit`).

## Development

```bash
npm install
npm run check   # tsgo --noEmit
```

Requires Node.js ≥ 22 (uses `tsx` to run TypeScript directly).
