# opencode-env 镜像: Debian + opencode CLI, 启动即运行 opencode web
FROM debian:bookworm

RUN apt-get update && \
    apt-get install -y ca-certificates curl wget ripgrep iputils-ping procps && \
    rm -rf /var/lib/apt/lists/*

# 版本号固定 = 构建缓存稳定
ARG OPENCODE_VERSION=1.15.12

# 从 GitHub Releases 下载 opencode (tar 包内只有单个 opencode 二进制)
# 注意: 用 glibc 版 (linux-x64), musl 版在 debian 上缺 musl loader 无法运行
RUN curl -fsSL "https://github.com/anomalyco/opencode/releases/download/v${OPENCODE_VERSION}/opencode-linux-x64.tar.gz" \
    | tar xz -C /usr/local/bin && \
    chmod +x /usr/local/bin/opencode

# 注入默认配置（具名卷首次创建时会继承镜像内容）
COPY ./config/opencode.jsonc /root/.config/opencode/opencode.jsonc

WORKDIR /workspace

VOLUME ["/root/.config/opencode", "/root/.local/share/opencode", "/workspace"]

EXPOSE 7777

CMD ["opencode", "web", "--port", "7777", "--hostname", "0.0.0.0"]
