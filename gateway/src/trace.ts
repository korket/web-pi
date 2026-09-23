import { appendFileSync, existsSync, mkdirSync, renameSync, statSync } from "node:fs";
import { dirname } from "node:path";

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;

/**
 * Append-only JSONL trace of every gateway-visible RPC record.
 * Rotates by rename when past `maxBytes`. No trace = failed run.
 */
export class TraceWriter {
	#bytes = 0;
	#file: string;
	#maxBytes: number;

	constructor(file: string, maxBytes: number = DEFAULT_MAX_BYTES) {
		this.#file = file;
		this.#maxBytes = maxBytes;
		mkdirSync(dirname(file), { recursive: true });
		this.#bytes = existsSync(file) ? statSync(file).size : 0;
	}

	write(record: Record<string, unknown>): void {
		const line = `${JSON.stringify({ ts: new Date().toISOString(), ...record })}\n`;
		const size = Buffer.byteLength(line);
		if (this.#bytes + size > this.#maxBytes) this.#rotate();
		appendFileSync(this.#file, line);
		this.#bytes += size;
	}

	#rotate(): void {
		const stamp = new Date().toISOString().replace(/[:.]/g, "-");
		renameSync(this.#file, `${this.#file}.${stamp}`);
		this.#bytes = 0;
	}
}
