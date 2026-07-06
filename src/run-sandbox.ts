/**
 * run-sandbox.ts
 * 根据 projectId 在 MicroSandbox 中启动 opencode-env 镜像, 输出 opencode web 的访问 URL。
 * 沙箱与三个具名卷(config/data/workspace)按 projectId 隔离, 重启不丢数据。
 *
 * 前置: 镜像已推到本地 registry, 见 docs/push-to-local-registry.md
 * 用法: npx tsx src/run-sandbox.ts [projectId] [hostPort]
 */

import { Sandbox, Volume, NetworkPolicyBuilder } from "microsandbox";

const projectId = process.argv[2] ?? "proj-test";
const HOST_WEB_PORT = Number(process.argv[3] ?? 17777); // 不同 projectId 并行跑时需换端口
const CTR_WEB_PORT = 7777;

const SB_NAME = `opencode-${projectId}`;
const IMAGE = process.env.OPENCODE_IMAGE ?? "localhost:5000/opencode-env:latest";

// 持久化具名卷（每个 project 独立）—— 不存在则建
async function getOrCreateVolume(name: string, quotaMb: number) {
  try {
    return await Volume.get(name);
  } catch {
    return await Volume.builder(name).quota(quotaMb).create();
  }
}

const volConfig = await getOrCreateVolume(`opencode-config-${projectId}`, 64);
const volData = await getOrCreateVolume(`opencode-data-${projectId}`, 256);
const volWorkspace = await getOrCreateVolume(`opencode-workspace-${projectId}`, 2048);
console.log(`[volumes] ${volConfig.name} / ${volData.name} / ${volWorkspace.name}`);

let reused = false;

// 沙箱存在则复用/重启, 否则新建 —— 全部 detached, 脚本退出后沙箱继续跑
async function getOrCreateSandbox(): Promise<Sandbox> {
  try {
    const existing = await Sandbox.get(SB_NAME);
    if (["stopped", "crashed"].includes(existing.status)) {
      console.log(`[${SB_NAME}] 沙箱状态 ${existing.status}, 重新启动...`);
      return existing.startDetached();
    }
    console.log(`[${SB_NAME}] 连接已有沙箱`);
    reused = true;
    return existing.connect();
  } catch {
    console.log(`[${SB_NAME}] 创建新沙箱...`);
    return Sandbox.builder(SB_NAME)
      .image(IMAGE)
      .memory(1024)
      // opencode 需要联网访问 AI API, 全放行
      .network((n) =>
        n
          .policyFromBuilder(new NetworkPolicyBuilder().defaultEgress("allow").defaultIngress("allow"))
          .portBind("0.0.0.0", HOST_WEB_PORT, CTR_WEB_PORT)
      )
      .volume("/root/.config/opencode", (m) => m.named(volConfig.name))
      .volume("/root/.local/share/opencode", (m) => m.named(volData.name))
      .volume("/workspace", (m) => m.named(volWorkspace.name))
      .createDetached();
  }
}

const sb = await getOrCreateSandbox();

if (reused) {
  // 复用沙箱: 检查 opencode 进程与端口监听状态
  const check = await sb.shell(
    `ps -ef | grep opencode | grep -v grep || echo '[warn] opencode 进程未找到'; \
     ss -tlnp 2>/dev/null | grep ':${CTR_WEB_PORT}\\b' || echo '[warn] 端口 ${CTR_WEB_PORT} 未监听'`
  );
  console.log(check);
} else {
  // 后台启动 opencode web, 不 await wait()
  await sb.execStream("opencode", ["web", "--port", String(CTR_WEB_PORT), "--hostname", "0.0.0.0"]);
}

console.log("\n=== 沙箱已就绪 ===");
console.log(`  opencode web : http://localhost:${HOST_WEB_PORT}`);
console.log(`  sandbox name : ${SB_NAME}`);
console.log(`  project id   : ${projectId}`);
console.log("\n沙箱 detached 后台运行, 停止: msb stop " + SB_NAME);
