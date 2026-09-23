import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { VERSION } from "@earendil-works/pi-coding-agent";
import { WebSocketServer } from "ws";
import { PiManager } from "./pi-manager.ts";
import { TraceWriter } from "./trace.ts";
import { attachClient } from "./ws.ts";

const EXPECTED_PI_VERSION = process.env.WEBPI_EXPECT_PI_VERSION ?? "0.87.1";
// Defaults anchor to the repo root (two levels up from gateway/src), not process.cwd():
// npm runs workspace scripts from gateway/, which would scatter allow roots and traces.
const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const PORT = Number(process.env.WEBPI_PORT ?? 7717);
const TOKEN = process.env.WEBPI_TOKEN ?? randomBytes(24).toString("hex");
const ALLOW_ROOTS = (process.env.WEBPI_ALLOW_ROOTS ?? REPO_ROOT)
	.split(/[;]/)
	.map((part) => part.trim())
	.filter(Boolean)
	.map((part) => resolve(part));
const ALLOWED_ORIGINS = new Set(
	(process.env.WEBPI_ALLOWED_ORIGINS ?? "http://localhost:5173,http://127.0.0.1:5173")
		.split(",")
		.map((part) => part.trim())
		.filter(Boolean),
);

if (VERSION !== EXPECTED_PI_VERSION && process.env.WEBPI_ALLOW_ANY_PI_VERSION !== "1") {
	console.error(
		`pi version mismatch: gateway pins ${EXPECTED_PI_VERSION}, package provides ${VERSION}. ` +
			`Set WEBPI_EXPECT_PI_VERSION or WEBPI_ALLOW_ANY_PI_VERSION=1 deliberately.`,
	);
	process.exit(1);
}

// RpcClient spawns `node <cliPath> --mode rpc ...`; cli.js sits next to the package entry.
const packageEntry = fileURLToPath(import.meta.resolve("@earendil-works/pi-coding-agent"));
const cliPath = fileURLToPath(new URL("cli.js", pathToFileURL(packageEntry)));

const trace = new TraceWriter(process.env.WEBPI_TRACE ?? resolve(REPO_ROOT, ".pi-sessions/trace.jsonl"));
const clients = new Set<import("ws").WebSocket>();
const pi = new PiManager({
	cliPath,
	allowRoots: ALLOW_ROOTS,
	trace,
	onEvent: (event) => {
		const frame = JSON.stringify({ type: "event", event });
		for (const socket of clients) {
			if (socket.readyState === socket.OPEN) socket.send(frame);
		}
	},
});

const server = createServer((request, response) => {
	// Same-origin only: no CORS headers. Token gate for the health probe.
	if (request.url === "/healthz" && request.headers["x-webpi-token"] === TOKEN) {
		response.writeHead(200, { "content-type": "application/json" });
		response.end(JSON.stringify({ ok: true, version: VERSION, session: pi.hasSession() }));
		return;
	}
	response.writeHead(404).end();
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
	// CSRF defense: browsers always send Origin on WS upgrades. Token is the auth gate.
	const origin = request.headers.origin;
	if (origin !== undefined && !ALLOWED_ORIGINS.has(origin)) {
		socket.end("HTTP/1.1 403 Forbidden\r\n\r\n");
		return;
	}
	const url = new URL(request.url ?? "/", "http://127.0.0.1");
	if (url.searchParams.get("token") !== TOKEN) {
		socket.end("HTTP/1.1 401 Unauthorized\r\n\r\n");
		return;
	}
	wss.handleUpgrade(request, socket, head, (client) => {
		clients.add(client);
		client.on("close", () => clients.delete(client));
		client.send(JSON.stringify({ type: "hello", piVersion: VERSION, tokenRequired: true }));
		attachClient(client, pi, trace);
	});
});

server.listen(PORT, "127.0.0.1", () => {
	console.log(`web-pi gateway on ws://127.0.0.1:${PORT} (pi ${VERSION}, cli ${cliPath})`);
	console.log(`allow roots: ${ALLOW_ROOTS.join(", ")}`);
	console.log(`token: ${TOKEN}`);
});

let shuttingDown = false;
async function shutdown(): Promise<void> {
	if (shuttingDown) return;
	shuttingDown = true;
	await pi.dispose();
	server.close();
	wss.close();
	process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
