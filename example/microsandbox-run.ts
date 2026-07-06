/**
 * microsandbox-run.ts
 * Minimal example: run the opencode image in a MicroSandbox microVM,
 * like `docker run --rm` — starts, prints the web URL, and the sandbox
 * dies with the script (Ctrl+C).
 *
 * Usage: npx tsx example/microsandbox-run.ts [hostPort]
 */

import { Sandbox, NetworkPolicyBuilder } from "microsandbox";

const HOST_PORT = Number(process.argv[2] ?? 17777);
const CTR_PORT = 7777;
const IMAGE = process.env.OPENCODE_IMAGE ?? "ghcr.io/ctxinf/opencode-image:latest"; // TODO: replace ctxinf

const sb = await Sandbox.builder("opencode-example")
  .image(IMAGE)
  .memory(512)
  // opencode needs egress to reach AI APIs
  .network((n) =>
    n
      .policyFromBuilder(new NetworkPolicyBuilder().defaultEgress("allow").defaultIngress("allow"))
      .portBind("0.0.0.0", HOST_PORT, CTR_PORT)
  )
  .create();

console.log(`opencode web: http://localhost:${HOST_PORT}  (Ctrl+C to stop)`);

// Blocks until opencode exits; the attached sandbox is torn down with the script.
await sb.exec("opencode", ["web", "--port", String(CTR_PORT), "--hostname", "0.0.0.0"]);
await sb.stop();
