#!/usr/bin/env node
/**
 * P0 e2e: boot the gateway for real, prove the WS gate end to end.
 * Covers the done gate: boot + resync + allowlist + trace. No model call.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { WebSocket } from "ws";

const REPO_ROOT = fileURLToPath(new URL("../", import.meta.url));
const GATEWAY = fileURLToPath(new URL("../gateway/src/index.ts", import.meta.url));
const PORT = 7719;
const TOKEN = "e2e-token";
const TRACE = `${REPO_ROOT}.pi-sessions/trace.jsonl`;

rmSync(TRACE, { force: true });

const child = spawn("node", [GATEWAY], {
	cwd: REPO_ROOT,
	env: { ...process.env, WEBPI_TOKEN: TOKEN, WEBPI_PORT: String(PORT) },
	stdio: ["ignore", "pipe", "pipe"],
});

function fail(message) {
	child.kill("SIGKILL");
	console.error(`e2e FAIL: ${message}`);
	process.exit(1);
}

const deadline = setTimeout(() => fail("timeout"), 30_000);

let bootLog = "";
child.stdout.on("data", (chunk) => {
	bootLog += chunk.toString();
	if (bootLog.includes("gateway on ws://127.0.0.1:" + PORT)) void run();
});

let running = false;
async function run() {
	if (running) return;
	running = true;
	const ws = new WebSocket(`ws://127.0.0.1:${PORT}?token=${TOKEN}`);
	let id = 0;
	const rpc = (body) =>
		new Promise((resolve, reject) => {
			const rid = `e2e-${++id}`;
			const on = (data) => {
				const message = JSON.parse(data.toString());
				if (message.type !== "response" || message.id !== rid) return;
				ws.off("message", on);
				message.ok ? resolve(message.data) : reject(new Error(message.error));
			};
			ws.on("message", on);
			ws.send(JSON.stringify({ ...body, id: rid }));
		});

	ws.on("open", async () => {
		try {
			const created = await rpc({ type: "create", cwd: REPO_ROOT, name: "e2e" });
			if (!created || created.name !== "e2e") throw new Error(`bad create: ${JSON.stringify(created)}`);

			const snapshot = await rpc({ type: "resync" });
			if (!snapshot.state || !Array.isArray(snapshot.messages) || !snapshot.entries) {
				throw new Error("resync missing state/messages/entries");
			}

			const rejected = await rpc({ type: "set_model", provider: "x", modelId: "y" }).then(
				() => null,
				(error) => error.message,
			);
			if (!rejected?.includes("not in P0 allowlist")) throw new Error("set_model was not rejected");

			const escape = await rpc({ type: "create", cwd: "C:/Windows/Temp", name: "esc" }).then(
				() => null,
				(error) => error.message,
			);
			if (escape !== "P0 supports one session; one is already running") {
				throw new Error(`second create not capped: ${escape}`);
			}

			ws.close();
			clearTimeout(deadline);
			child.kill("SIGTERM");
			setTimeout(() => {
				if (!existsSync(TRACE)) fail("trace file missing");
				const trace = readFileSync(TRACE, "utf8");
				if (!trace.includes('"dir":"request"') || !trace.includes("session started")) {
					fail("trace missing request/session records");
				}
				console.log("e2e OK: boot + create + resync + allowlist + trace");
				process.exit(0);
			}, 1500);
		} catch (error) {
			fail(error instanceof Error ? error.message : String(error));
		}
	});
	ws.on("error", (error) => fail(`ws error: ${error.message}`));
}
