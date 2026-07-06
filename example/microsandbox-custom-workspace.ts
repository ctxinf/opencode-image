/**
 * microsandbox-custom-workspace.ts
 * Same as microsandbox-run.ts, but shows how to customize the workspace:
 * the sandbox fs API creates /workspace/app1 (with a starter file), and
 * opencode opens it as the project dir via the OPENCODE_WORKDIR env var.
 *
 * Usage: npx tsx example/microsandbox-custom-workspace.ts [hostPort]
 */

import { Sandbox, NetworkPolicyBuilder } from "microsandbox";

const HOST_PORT = Number(process.argv[2] ?? 17777);
const CTR_PORT = 7777;
const IMAGE = process.env.OPENCODE_IMAGE ?? "ghcr.io/ctxinf/opencode-image:latest";
const WORKDIR = "/workspace/app1";

const sb = await Sandbox.builder("opencode-custom-workspace")
  .image(IMAGE)
  .memory(512)
  // opencode needs egress to reach AI APIs
  .network((n) =>
    n
      .policyFromBuilder(new NetworkPolicyBuilder().defaultEgress("allow").defaultIngress("allow"))
      .portBind("0.0.0.0", HOST_PORT, CTR_PORT)
  )
  .replace()
  .create();

// Prepare the workspace through the sandbox fs API
const fs = sb.fs();
if (!(await fs.exists(WORKDIR))) {
  await fs.mkdir(WORKDIR);
  await fs.write(`${WORKDIR}/README.md`, "# app1\n\nSeeded by microsandbox-custom-workspace.ts\n");
}
// git repo marks the dir as the opencode project (otherwise it falls back to "/")
await sb.shell(`cd ${WORKDIR} && { [ -d .git ] || git init -q -b main .; }`);

console.log(`opencode web: http://localhost:${HOST_PORT}  workspace: ${WORKDIR}  (Ctrl+C to stop)`);

// Start opencode in the custom dir; blocks until it exits
await sb.execWith("opencode", (b) =>
  b.args(["web", "--port", String(CTR_PORT), "--hostname", "0.0.0.0"]).cwd(WORKDIR)
);
await sb.stop();
