import type { PartialBlock, ToolRow } from "../lib/reconstruct.ts";

export interface TranscriptItem {
	kind: "message";
	role: string;
	content: unknown;
}

interface TranscriptProps {
	items: TranscriptItem[];
	live: PartialBlock[];
	tools: ToolRow[];
}

function textOf(content: unknown): string {
	if (typeof content === "string") return content;
	if (Array.isArray(content)) {
		return content
			.map((block) => {
				const typed = block as { type?: string; text?: string; name?: string; arguments?: unknown };
				if (typed.type === "text") return typed.text ?? "";
				if (typed.type === "thinking") return `[thinking] ${typed.text ?? ""}`;
				if (typed.type === "toolCall") return `[tool: ${typed.name}] ${JSON.stringify(typed.arguments ?? {})}`;
				return "";
			})
			.filter(Boolean)
			.join("\n");
	}
	return JSON.stringify(content);
}

function BlockView({ block }: { block: PartialBlock }) {
	if (block.kind === "thinking") return <div className="msg thinking">{block.text || "…"}</div>;
	if (block.kind === "toolCall") {
		return (
			<div className="tool-row">
				{block.toolName ?? "tool"} {block.text}
			</div>
		);
	}
	return <div className="msg assistant">{block.text || "…"}</div>;
}

function ToolRowView({ row }: { row: ToolRow }) {
	return (
		<div className={`tool-row${row.state === "error" ? " error" : ""}`}>
			{row.state === "running" ? "running" : row.state} {row.toolName} {row.args}
		</div>
	);
}

export function Transcript({ items, live, tools }: TranscriptProps) {
	return (
		<div className="transcript">
			{items.map((item, index) => (
				<div key={index} className={`msg ${item.role}`}>
					{textOf(item.content)}
				</div>
			))}
			{tools.map((row) => (
				<ToolRowView key={row.toolCallId} row={row} />
			))}
			{live.map((block) => (
				<BlockView key={block.contentIndex} block={block} />
			))}
		</div>
	);
}
