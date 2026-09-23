import type { WebSocket } from "ws";
import type { ClientRequest, ServerMessage } from "../../shared/protocol.ts";
import type { PiManager } from "./pi-manager.ts";
import type { TraceWriter } from "./trace.ts";

function send(socket: WebSocket, message: ServerMessage): void {
	if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
}

function parseRequest(raw: string): ClientRequest {
	const parsed: unknown = JSON.parse(raw);
	if (typeof parsed !== "object" || parsed === null) throw new Error("request must be an object");
	const request = parsed as Partial<ClientRequest>;
	if (typeof request.id !== "string" || typeof request.type !== "string") {
		throw new Error("request needs string id and type");
	}
	return request as ClientRequest;
}

/**
 * Route client requests to the P0 Pi allowlist. Unknown types are rejected:
 * this switch is the allowlist, there is no passthrough to arbitrary RPC.
 */
async function route(pi: PiManager, request: ClientRequest): Promise<unknown> {
	switch (request.type) {
		case "create":
			return pi.create({ cwd: request.cwd, name: request.name });
		case "prompt":
			await pi.prompt(request.text);
			// Accepted, not finished: completion arrives as an `agent_settled` event.
			return { accepted: true };
		case "abort":
			await pi.abort();
			return { aborted: true };
		case "clear_queue":
			return pi.clearQueue();
		case "new_session":
			return pi.newSession();
		case "state":
			return pi.getState();
		case "messages":
			return pi.getMessages();
		case "entries":
			return pi.getEntries(request.since);
		case "resync": {
			const [state, messages, entries] = await Promise.all([
				pi.getState(),
				pi.getMessages(),
				pi.getEntries(request.lastEntryId ?? undefined),
			]);
			return { state, messages, entries };
		}
		default: {
			const type = (request as { type: string }).type;
			throw new Error(`not in P0 allowlist: ${type}`);
		}
	}
}

/** Attach one authenticated socket: relay Pi events, answer allowlisted requests. */
export function attachClient(socket: WebSocket, pi: PiManager, trace: TraceWriter): void {
	socket.on("message", (data) => {
		void (async () => {
			let id = "unknown";
			try {
				const request = parseRequest(data.toString());
				id = request.id;
				trace.write({ dir: "request", request });
				const result = await route(pi, request);
				send(socket, { type: "response", id, ok: true, data: result });
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				trace.write({ dir: "error", id, error: message });
				send(socket, { type: "response", id, ok: false, error: message });
			}
		})();
	});
}
