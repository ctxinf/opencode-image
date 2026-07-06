# opencode-image: Debian + opencode CLI, runs `opencode web` by default
FROM debian:bookworm

RUN apt-get update && \
    apt-get install -y ca-certificates curl wget ripgrep iputils-ping procps && \
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

WORKDIR /workspace

VOLUME ["/root/.config/opencode", "/root/.local/share/opencode", "/workspace"]

EXPOSE 7777

CMD ["opencode", "web", "--port", "7777", "--hostname", "0.0.0.0"]
