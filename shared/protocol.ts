/** Wire protocol between web client and gateway. P0 allowlist is exactly this set. */

export interface ToolCallLike {
	id: string;
	name: string;
	arguments: Record<string, unknown>;
}

/** Delta-only assistant stream event (json.md `message_update.assistantMessageEvent`). */
export type AssistantStreamEvent =
	| { type: "start" }
	| { type: "text_start"; contentIndex: number }
	| { type: "text_delta"; contentIndex: number; delta: string }
	| { type: "text_end"; contentIndex: number; content: string }
	| { type: "thinking_start"; contentIndex: number }
	| { type: "thinking_delta"; contentIndex: number; delta: string }
	| { type: "thinking_end"; contentIndex: number; content: string }
	| { type: "toolcall_start"; contentIndex: number; id: string; toolName: string }
	| { type: "toolcall_delta"; contentIndex: number; delta: string }
	| { type: "toolcall_end"; contentIndex: number; toolCall: ToolCallLike }
	| { type: "done"; reason: string }
	| { type: "error"; reason: string; error: string };

export type SessionEvent = {
	type: string;
	message?: unknown;
	assistantMessageEvent?: AssistantStreamEvent;
	toolCallId?: string;
	toolName?: string;
	args?: unknown;
	partialResult?: unknown;
	result?: unknown;
	isError?: boolean;
	[key: string]: unknown;
};

/** Client -> gateway. Every request carries an `id` echoed on the response. */
export type ClientRequest =
	| { id: string; type: "create"; cwd?: string; name?: string }
	| { id: string; type: "prompt"; text: string }
	| { id: string; type: "abort" }
	| { id: string; type: "clear_queue" }
	| { id: string; type: "new_session" }
	| { id: string; type: "state" }
	| { id: string; type: "messages" }
	| { id: string; type: "entries"; since?: string }
	| { id: string; type: "resync"; lastEntryId?: string | null };

/** Client request without correlation id, for callers that assign one. */
export type ClientRequestBody<T = ClientRequest> = T extends unknown ? Omit<T, "id"> : never;

/** Gateway -> client. `event` frames carry live Pi session events. */
export type ServerMessage =
	| { type: "hello"; piVersion: string; tokenRequired: true; allowRoots: string[] }
	| { type: "response"; id: string; ok: true; data?: unknown }
	| { type: "response"; id: string; ok: false; error: string }
	| { type: "event"; event: SessionEvent };
