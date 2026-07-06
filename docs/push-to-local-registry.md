# 把本地 Docker 镜像推到本地 Registry（供 MicroSandbox 使用）

> 背景: MicroSandbox 只认 OCI registry 中的镜像, 不读 Docker daemon 本地镜像缓存.
> 方案: 跑一个本地 `registry:2`, 把 `opencode-env:latest` 推上去, MicroSandbox 用 `localhost:5000/opencode-env:latest` 拉取.

---

## 步骤 1: 启动本地 registry

```bash
services:
  registry:
    image: registry:2
    container_name: local-registry
    restart: unless-stopped
    ports:
      - "5000:5000"
    volumes:
      - local-registry-data:/var/lib/registry

volumes:
  local-registry-data:
```

验证:
```bash
curl http://localhost:5000/v2/_catalog
# 输出: {"repositories":[]}
```

---

## 步骤 2: 配置 MicroSandbox 允许 HTTP registry

本地 registry 无 TLS, 必须标记为 insecure. 编辑 `~/.microsandbox/config.json` (不存在则新建):

```json
{
  "registries": {
    "hosts": {
      "localhost:5000": {
        "insecure": true
      }
    }
  }
}
```

---

## 步骤 3: 构建 + 打 tag + 推送

在 `docker/` 目录:

```bash
# 构建 (若已有镜像可跳过)
docker compose build
# 或: docker build -t opencode-env:latest .

# 打 registry tag
docker tag opencode-env:latest localhost:5000/opencode-env:latest

# 推送
docker push localhost:5000/opencode-env:latest
```

验证推送成功:
```bash
curl http://localhost:5000/v2/_catalog
# {"repositories":["opencode-env"]}

curl http://localhost:5000/v2/opencode-env/tags/list
# {"name":"opencode-env","tags":["latest"]}
```

---

## 步骤 4: 改 SDK 代码使用 registry 镜像

`src/run-sandbox.ts` 里:

```ts
Sandbox.builder(SB_NAME)
  .image("localhost:5000/opencode-env:latest")   // 改这里
  .registry((r) => r.insecure())                  // 加这行 (双保险, 覆盖全局 config)
  .memory(1024)
  ...
```

---

## 步骤 5: (可选) 预拉取, 避免首次 create 阻塞

```bash
msb pull localhost:5000/opencode-env:latest
```

---

## 后续: 镜像更新流程

改 Dockerfile 后:
```bash
docker compose build
docker tag opencode-env:latest localhost:5000/opencode-env:latest
docker push localhost:5000/opencode-env:latest

# MicroSandbox 默认 if-missing 不会重拉, 需要 .pull_policy(PullPolicy::Always)
# 或者手动清缓存: rm -rf ~/.microsandbox/cache/layers/* (谨慎)
```

SDK 强制重拉:
```ts
.image("localhost:5000/opencode-env:latest")
.pullPolicy("always")
```

---

## 故障排查

| 现象 | 原因 | 解决 |
|---|---|---|
| `http: server gave HTTP response to HTTPS client` | 没配 insecure | 步骤 2 |
| `connection refused` | registry 没起来 | `docker ps \| grep registry` |
| `manifest unknown` | tag 错或没 push | 重新 `docker push` |
| MicroSandbox 仍用旧镜像 | 缓存命中 | `pullPolicy("always")` 或清 `~/.microsandbox/cache/layers/` |
