#!/usr/bin/env node
/**
 * P0 smoke: spawn `pi --mode rpc --no-session`, one `get_state` round-trip over
 * strict LF framing, clean shutdown. No model call, no credentials needed.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const cliPath =
	process.env.WEBPI_PI_CLI ??
	fileURLToPath(new URL("cli.js", import.meta.resolve("@earendil-works/pi-coding-agent")));

const child = spawn("node", [cliPath, "--mode", "rpc", "--no-session"], {
	stdio: ["pipe", "pipe", "pipe"],
});

let stderr = "";
child.stderr.on("data", (chunk) => (stderr += chunk.toString()));

const deadline = setTimeout(() => {
	child.kill("SIGKILL");
	console.error(`smoke FAIL: timeout waiting for get_state response\n${stderr}`);
	process.exit(1);
}, 20_000);

let buffer = Buffer.alloc(0);
child.stdout.on("data", (chunk) => {
	// Strict LF split on bytes: never readline (splits U+2028/29 inside JSON).
	buffer = Buffer.concat([buffer, chunk]);
	for (;;) {
		const nl = buffer.indexOf(0x0a);
		if (nl < 0) break;
		const line = buffer.subarray(0, nl).toString("utf8").replace(/\r$/, "");
		buffer = buffer.subarray(nl + 1);
		if (!line.trim()) continue;
		let record;
		try {
			record = JSON.parse(line);
		} catch {
			console.error(`smoke FAIL: non-JSON line: ${line.slice(0, 200)}`);
			process.exit(1);
		}
		if (record.type === "response" && record.id === "smoke-1") {
			clearTimeout(deadline);
			if (record.success === true) {
				console.log("smoke OK: pi --mode rpc get_state round-trip");
				child.stdin.end();
				child.kill("SIGTERM");
				process.exit(0);
			}
			console.error(`smoke FAIL: get_state rejected: ${record.error}`);
			process.exit(1);
		}
	}
});

child.on("error", (error) => {
	clearTimeout(deadline);
	console.error(`smoke FAIL: spawn error: ${error.message}\n${stderr}`);
	process.exit(1);
});

child.stdin.write(`${JSON.stringify({ id: "smoke-1", type: "get_state" })}\n`);
