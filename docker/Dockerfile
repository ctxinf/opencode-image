# opencode-image: Debian + opencode CLI, runs `opencode web` by default
FROM debian:bookworm

# tini = proper PID 1: forwards SIGINT/SIGTERM and reaps children, so
# Ctrl+C on `docker run` actually stops the container.
RUN apt-get update && \
    apt-get install -y ca-certificates curl wget git tini ripgrep iputils-ping procps && \
    rm -rf /var/lib/apt/lists/*

# Pinned version = stable build cache
ARG OPENCODE_VERSION=1.15.12

# Download opencode from GitHub Releases (tarball contains the single binary).
# Note: use the glibc build (linux-x64); the musl build cannot run on Debian
# because the musl loader is missing.
RUN curl -fsSL "https://github.com/anomalyco/opencode/releases/download/v${OPENCODE_VERSION}/opencode-linux-x64.tar.gz" \
    | tar xz -C /usr/local/bin && \
    chmod +x /usr/local/bin/opencode

# Default config; named volumes inherit it on first creation
COPY ./config/opencode.jsonc /root/.config/opencode/opencode.jsonc

# Initial workspace dir, overridable at runtime: docker run -e OPENCODE_WORKDIR=/workspace/app1
ENV OPENCODE_WORKDIR=/workspace

WORKDIR /workspace

# Without a git repo at the workdir, opencode falls back to its "global"
# project rooted at "/" — init an empty repo so /workspace is the project.
# The named workspace volume inherits it on first creation.
RUN git init -q -b main /workspace

VOLUME ["/root/.config/opencode", "/root/.local/share/opencode", "/workspace"]

EXPOSE 7777

ENTRYPOINT ["/usr/bin/tini", "--"]

# Create + git-init the (possibly overridden) workdir, then exec opencode
CMD ["/bin/sh", "-c", "mkdir -p \"$OPENCODE_WORKDIR\" && cd \"$OPENCODE_WORKDIR\" && { [ -d .git ] || git init -q -b main .; } && exec opencode web --port 7777 --hostname 0.0.0.0"]
