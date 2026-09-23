import { test } from "node:test";
import assert from "node:assert/strict";
import { AssistantAssembler, ToolRowTracker } from "./reconstruct.ts";

// Fixtures mirror json.md wire shapes (delta-only message_update events).

test("text blocks buffer deltas live and settle on text_end", () => {
	const assembler = new AssistantAssembler();
	assembler.apply({ type: "start" });
	assembler.apply({ type: "text_start", contentIndex: 0 });
	assembler.apply({ type: "text_delta", contentIndex: 0, delta: "Hello " });
	assembler.apply({ type: "text_delta", contentIndex: 0, delta: "world" });

	let blocks = assembler.snapshot();
	assert.equal(blocks.length, 1);
	assert.equal(blocks[0]?.text, "Hello world");
	assert.equal(blocks[0]?.done, false);

	assembler.apply({ type: "text_end", contentIndex: 0, content: "Hello world (final)" });
	blocks = assembler.snapshot();
	assert.equal(blocks[0]?.text, "Hello world (final)");
	assert.equal(blocks[0]?.done, true);
});

test("thinking and toolcall blocks stream in parallel contentIndexes", () => {
	const assembler = new AssistantAssembler();
	assembler.apply({ type: "thinking_start", contentIndex: 0 });
	assembler.apply({ type: "text_start", contentIndex: 1 });
	assembler.apply({ type: "toolcall_start", contentIndex: 2, id: "call_1", toolName: "bash" });
	assembler.apply({ type: "thinking_delta", contentIndex: 0, delta: "hmm" });
	assembler.apply({ type: "text_delta", contentIndex: 1, delta: "running" });
	assembler.apply({ type: "toolcall_delta", contentIndex: 2, delta: '{"command"' });
	assembler.apply({ type: "toolcall_delta", contentIndex: 2, delta: ':"ls"}' });
	assembler.apply({ type: "toolcall_end", contentIndex: 2, toolCall: { id: "call_1", name: "bash", arguments: { command: "ls" } } });

	const blocks = assembler.snapshot();
	assert.deepEqual(
		blocks.map((block) => [block.contentIndex, block.kind, block.done]),
		[
			[0, "thinking", false],
			[1, "text", false],
			[2, "toolCall", true],
		],
	);
	assert.equal(blocks[2]?.toolName, "bash");
	assert.equal(blocks[2]?.text, '{"command":"ls"}');
});

test("a missed *_start still yields content from deltas", () => {
	const assembler = new AssistantAssembler();
	assembler.apply({ type: "text_delta", contentIndex: 3, delta: "late" });
	const blocks = assembler.snapshot();
	assert.equal(blocks[0]?.kind, "text");
	assert.equal(blocks[0]?.text, "late");
});

test("finalize replaces deltas with authoritative message_end content", () => {
	const assembler = new AssistantAssembler();
	assembler.apply({ type: "text_start", contentIndex: 0 });
	assembler.apply({ type: "text_delta", contentIndex: 0, delta: "drifted text" });

	assembler.finalize([
		{ type: "text", text: "authoritative text" },
		{ type: "thinking", thinking: "auth think" },
		{ type: "toolCall", id: "call_9", name: "read", arguments: { path: "a.ts" } },
	]);

	const blocks = assembler.snapshot();
	assert.equal(blocks.length, 3);
	assert.equal(blocks[0]?.text, "authoritative text");
	assert.equal(blocks[0]?.done, true);
	assert.equal(blocks[1]?.kind, "thinking");
	assert.equal(blocks[1]?.text, "auth think");
	assert.equal(blocks[2]?.toolName, "read");
	assert.equal(blocks[2]?.text, '{"path":"a.ts"}');
});

test("tool rows track lifecycle by toolCallId, errors marked", () => {
	const tracker = new ToolRowTracker();
	tracker.apply({ type: "tool_execution_start", toolCallId: "call_a", toolName: "bash", args: { command: "ls" } });
	tracker.apply({ type: "tool_execution_update", toolCallId: "call_a", toolName: "bash", args: { command: "ls" }, partialResult: { out: "partial" } });
	tracker.apply({ type: "tool_execution_end", toolCallId: "call_a", toolName: "bash", result: { out: "full" }, isError: false });
	tracker.apply({ type: "tool_execution_start", toolCallId: "call_b", toolName: "write", args: { path: "x" } });
	tracker.apply({ type: "tool_execution_end", toolCallId: "call_b", toolName: "write", result: { err: "denied" }, isError: true });

	const rows = tracker.rows();
	assert.equal(rows.length, 2);
	assert.equal(rows[0]?.state, "done");
	assert.equal(rows[0]?.result, '{"out":"full"}');
	assert.equal(rows[1]?.state, "error");

	// Unknown toolCallId end is ignored, never crashes the render loop.
	tracker.apply({ type: "tool_execution_end", toolCallId: "missing", toolName: "x", result: {}, isError: false });
	assert.equal(tracker.rows().length, 2);
});
