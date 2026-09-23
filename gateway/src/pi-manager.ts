import { RpcClient, type JsonAgentSessionEvent } from "@earendil-works/pi-coding-agent";
import type { TraceWriter } from "./trace.ts";
import { validateCwd, validateName } from "./validate.ts";

export interface PiManagerOptions {
	cliPath: string;
	allowRoots: string[];
	trace: TraceWriter;
	onEvent: (event: JsonAgentSessionEvent) => void;
}

const STOP_TIMEOUT_MS = 5000;

/**
 * Owns the single P0 `pi --mode rpc` child process through RpcClient.
 * P0 allowlist: create, prompt, abort, clearQueue, newSession, getState,
 * getMessages, getEntries. Everything else lands in P1+.
 */
export class PiManager {
	#client: RpcClient | null = null;
	#unsubscribe: (() => void) | null = null;
	#options: PiManagerOptions;

	constructor(options: PiManagerOptions) {
		this.#options = options;
	}

	hasSession(): boolean {
		return this.#client !== null;
	}

	async create(input: { cwd?: string; name?: string }): Promise<{ cwd: string; name: string }> {
		if (this.#client) throw new Error("P0 supports one session; one is already running");
		const cwd = validateCwd(input.cwd, this.#options.allowRoots);
		const name = validateName(input.name ?? "web-pi");
		const client = new RpcClient({
			cliPath: this.#options.cliPath,
			cwd,
			args: ["--no-session", "--name", name],
		});
		this.#unsubscribe = client.onEvent((event) => {
			this.#options.trace.write({ dir: "event", event });
			this.#options.onEvent(event);
		});
		try {
			await client.start();
		} catch (error) {
			this.#unsubscribe();
			this.#unsubscribe = null;
			throw error;
		}
		this.#client = client;
		this.#options.trace.write({ dir: "info", message: "session started", cwd, name });
		return { cwd, name };
	}

	async prompt(text: string): Promise<void> {
		if (!text.trim()) throw new Error("empty prompt");
		this.#options.trace.write({ dir: "command", command: "prompt", text });
		await this.#require().prompt(text);
	}

	async abort(): Promise<void> {
		this.#options.trace.write({ dir: "command", command: "abort" });
		await this.#require().abort();
	}

	async clearQueue(): Promise<{ steering: string[]; followUp: string[] }> {
		this.#options.trace.write({ dir: "command", command: "clear_queue" });
		return this.#require().clearQueue();
	}

	async newSession(): Promise<{ cancelled: boolean }> {
		this.#options.trace.write({ dir: "command", command: "new_session" });
		return this.#require().newSession();
	}

	async getState(): Promise<unknown> {
		return this.#require().getState();
	}

	async getMessages(): Promise<unknown> {
		return this.#require().getMessages();
	}

	async getEntries(since?: string): Promise<{ entries: unknown[]; leafId: string | null }> {
		const client = this.#require();
		try {
			return await client.getEntries(since);
		} catch {
			// Stale cursor (unknown entry id): fall back to the full entry list.
			return client.getEntries();
		}
	}

	async dispose(): Promise<void> {
		const client = this.#client;
		this.#client = null;
		this.#unsubscribe?.();
		this.#unsubscribe = null;
		if (!client) return;
		this.#options.trace.write({ dir: "info", message: "session stopping" });
		// RpcClient.stop() escalates SIGTERM -> SIGKILL; cap it either way.
		await Promise.race([
			client.stop(),
			new Promise((resolve) => setTimeout(resolve, STOP_TIMEOUT_MS)),
		]);
		this.#options.trace.write({ dir: "info", message: "session stopped" });
	}

	#require(): RpcClient {
		if (!this.#client) throw new Error("no active session");
		return this.#client;
	}
}
