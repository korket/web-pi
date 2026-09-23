/**
 * Rebuild a streaming assistant message from delta-only `message_update` events
 * (json.md), then replace everything with the authoritative `message_end` content.
 */

export type StreamEvent =
	| { type: "start" }
	| { type: "text_start"; contentIndex: number }
	| { type: "text_delta"; contentIndex: number; delta: string }
	| { type: "text_end"; contentIndex: number; content: string }
	| { type: "thinking_start"; contentIndex: number }
	| { type: "thinking_delta"; contentIndex: number; delta: string }
	| { type: "thinking_end"; contentIndex: number; content: string }
	| { type: "toolcall_start"; contentIndex: number; id: string; toolName: string }
	| { type: "toolcall_delta"; contentIndex: number; delta: string }
	| { type: "toolcall_end"; contentIndex: number; toolCall: { id: string; name: string; arguments: unknown } }
	| { type: "done"; reason: string }
	| { type: "error"; reason: string; error: string };

export interface PartialBlock {
	contentIndex: number;
	kind: "text" | "thinking" | "toolCall";
	/** text/thinking buffer, or raw serialized tool arguments while streaming. */
	text: string;
	id?: string;
	toolName?: string;
	done: boolean;
}

interface ContentBlock {
	type: string;
	text?: string;
	thinking?: string;
	id?: string;
	name?: string;
	arguments?: unknown;
}

function blockFor(event: StreamEvent, existing?: PartialBlock): PartialBlock | undefined {
	switch (event.type) {
		case "text_start":
			return { contentIndex: event.contentIndex, kind: "text", text: "", done: false };
		case "thinking_start":
			return { contentIndex: event.contentIndex, kind: "thinking", text: "", done: false };
		case "toolcall_start":
			return {
				contentIndex: event.contentIndex,
				kind: "toolCall",
				text: "",
				id: event.id,
				toolName: event.toolName,
				done: false,
			};
		// Deltas tolerate a missed `*_start` (late subscribe): the block emerges.
		case "text_delta": {
			const base = existing ?? { contentIndex: event.contentIndex, kind: "text", text: "", done: false } as PartialBlock;
			return { ...base, text: base.text + event.delta };
		}
		case "thinking_delta": {
			const base = existing ?? { contentIndex: event.contentIndex, kind: "thinking", text: "", done: false } as PartialBlock;
			return { ...base, text: base.text + event.delta };
		}
		case "toolcall_delta": {
			const base = existing ?? { contentIndex: event.contentIndex, kind: "toolCall", text: "", done: false } as PartialBlock;
			return { ...base, text: base.text + event.delta };
		}
		case "text_end":
			if (!existing) return undefined;
			return { ...existing, text: event.content, done: true };
		case "thinking_end":
			if (!existing) return undefined;
			return { ...existing, text: event.content, done: true };
		case "toolcall_end":
			if (!existing) return undefined;
			return {
				...existing,
				text: JSON.stringify(event.toolCall.arguments ?? {}),
				id: event.toolCall.id,
				toolName: event.toolCall.name,
				done: true,
			};
		default:
			return existing;
	}
}

export class AssistantAssembler {
	#blocks = new Map<number, PartialBlock>();

	apply(event: StreamEvent): void {
		if (event.type === "start" || event.type === "done" || event.type === "error") return;
		const current = this.#blocks.get(event.contentIndex);
		const next = blockFor(event, current);
		if (next) this.#blocks.set(next.contentIndex, next);
	}

	/** `message_end.message.content` is authoritative: replace, never merge. */
	finalize(content: ReadonlyArray<ContentBlock>): void {
		this.#blocks.clear();
		content.forEach((block, contentIndex) => {
			if (block.type === "text") {
				this.#blocks.set(contentIndex, { contentIndex, kind: "text", text: block.text ?? "", done: true });
			} else if (block.type === "thinking") {
				this.#blocks.set(contentIndex, { contentIndex, kind: "thinking", text: block.thinking ?? "", done: true });
			} else if (block.type === "toolCall") {
				this.#blocks.set(contentIndex, {
					contentIndex,
					kind: "toolCall",
					text: JSON.stringify(block.arguments ?? {}),
					id: block.id,
					toolName: block.name,
					done: true,
				});
			}
		});
	}

	snapshot(): PartialBlock[] {
		return [...this.#blocks.values()].sort((a, b) => a.contentIndex - b.contentIndex);
	}
}

export interface ToolRow {
	toolCallId: string;
	toolName: string;
	args: string;
	state: "running" | "done" | "error";
	result?: string;
}

export type ToolEvent =
	| { type: "tool_execution_start"; toolCallId: string; toolName: string; args: unknown }
	| { type: "tool_execution_update"; toolCallId: string; toolName: string; args: unknown; partialResult: unknown }
	| { type: "tool_execution_end"; toolCallId: string; toolName: string; result: unknown; isError: boolean };

/** Tool lifecycle rows keyed by `toolCallId` (cards land in P1). */
export class ToolRowTracker {
	#rows = new Map<string, ToolRow>();

	apply(event: ToolEvent): void {
		if (event.type === "tool_execution_start") {
			this.#rows.set(event.toolCallId, {
				toolCallId: event.toolCallId,
				toolName: event.toolName,
				args: JSON.stringify(event.args ?? {}),
				state: "running",
			});
			return;
		}
		const row = this.#rows.get(event.toolCallId);
		if (!row) return;
		if (event.type === "tool_execution_update") {
			row.result = JSON.stringify(event.partialResult ?? {});
			return;
		}
		row.state = event.isError ? "error" : "done";
		row.result = JSON.stringify(event.result ?? {});
	}

	rows(): ToolRow[] {
		return [...this.#rows.values()];
	}
}
