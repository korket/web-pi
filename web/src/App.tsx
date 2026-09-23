import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientRequestBody, ServerMessage, SessionEvent } from "../../shared/protocol.ts";
import { Composer } from "./components/Composer.tsx";
import { Transcript, type TranscriptItem } from "./components/Transcript.tsx";
import { AssistantAssembler, ToolRowTracker, type PartialBlock, type ToolRow } from "./lib/reconstruct.ts";

interface HistoryMessage {
	role: string;
	content: unknown;
}

function toItems(messages: HistoryMessage[]): TranscriptItem[] {
	return messages
		.filter((message) => message.role === "user" || message.role === "assistant")
		.map((message) => ({ kind: "message", role: message.role, content: message.content }));
}

export function App() {
	const [token, setToken] = useState(() => {
		// Launcher opens the app as /?token=... — prefill, persist, and strip it.
		const fromUrl = new URLSearchParams(window.location.search).get("token");
		if (fromUrl) {
			localStorage.setItem("webpi-token", fromUrl);
			history.replaceState(null, "", window.location.pathname);
			return fromUrl;
		}
		return localStorage.getItem("webpi-token") ?? "";
	});
	const [cwd, setCwd] = useState(() => localStorage.getItem("webpi-cwd") ?? "");
	const [allowRoots, setAllowRoots] = useState<string[]>([]);
	const [name, setName] = useState("web-pi");
	const [connected, setConnected] = useState(false);
	const [hasSession, setHasSession] = useState(false);
	const [items, setItems] = useState<TranscriptItem[]>([]);
	const [live, setLive] = useState<PartialBlock[]>([]);
	const [tools, setTools] = useState<ToolRow[]>([]);
	const [streaming, setStreaming] = useState(false);
	const [error, setError] = useState("");

	const socketRef = useRef<WebSocket | null>(null);
	const assemblerRef = useRef(new AssistantAssembler());
	const toolsRef = useRef(new ToolRowTracker());
	const requestId = useRef(0);

	const applyEvent = useCallback((event: SessionEvent) => {
		if (event.type === "message_update" && event.assistantMessageEvent) {
			assemblerRef.current.apply(event.assistantMessageEvent);
			setLive(assemblerRef.current.snapshot());
			return;
		}
		if (event.type === "message_start") {
			setStreaming(true);
			return;
		}
		if (event.type === "message_end") {
			const message = event.message as HistoryMessage | undefined;
			assemblerRef.current = new AssistantAssembler();
			setLive([]);
			if (message) setItems((prev) => [...prev, ...toItems([message])]);
			if (message?.role === "assistant") setStreaming(false);
			return;
		}
		if (event.type.startsWith("tool_execution_")) {
			toolsRef.current.apply(event as never);
			setTools(toolsRef.current.rows());
			return;
		}
		if (event.type === "agent_settled") {
			setStreaming(false);
			assemblerRef.current = new AssistantAssembler();
			setLive([]);
		}
	}, []);

	const request = useCallback((body: ClientRequestBody): Promise<unknown> => {
		return new Promise((resolvePromise, reject) => {
			const socket = socketRef.current;
			if (!socket || socket.readyState !== WebSocket.OPEN) {
				reject(new Error("not connected"));
				return;
			}
			const id = `req-${++requestId.current}`;
			const pending = (event: MessageEvent<string>) => {
				const message = JSON.parse(event.data) as ServerMessage;
				if (message.type !== "response" || message.id !== id) return;
				socket.removeEventListener("message", pending);
				if (message.ok) resolvePromise(message.data);
				else reject(new Error(message.error));
			};
			socket.addEventListener("message", pending);
			socket.send(JSON.stringify({ ...body, id }));
		});
	}, []);

	const connect = useCallback(() => {
		socketRef.current?.close();
		const socket = new WebSocket(`ws://127.0.0.1:7717?token=${encodeURIComponent(token)}`);
		socketRef.current = socket;
		socket.onopen = () => {
			setConnected(true);
			setError("");
			void request({ type: "resync" })
				.then((data) => {
					const snapshot = data as { messages: HistoryMessage[] };
					setItems(toItems(snapshot.messages ?? []));
				})
				.catch(() => void 0); // no session yet: empty transcript
		};
		socket.onclose = () => setConnected(false);
		socket.onerror = () => setError("gateway unreachable");
		socket.onmessage = (event) => {
			const message = JSON.parse(event.data) as ServerMessage;
			if (message.type === "hello") setAllowRoots(message.allowRoots);
			if (message.type === "event") applyEvent(message.event);
		};
	}, [token, request, applyEvent]);

	useEffect(() => {
		return () => socketRef.current?.close();
	}, []);

	const createSession = useCallback(async () => {
		try {
			await request({ type: "create", cwd, name });
			localStorage.setItem("webpi-cwd", cwd);
			setHasSession(true);
			setError("");
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	}, [request, cwd, name]);

	const send = useCallback(
		async (text: string) => {
			try {
				await request({ type: "prompt", text });
				setError("");
			} catch (err) {
				setError(err instanceof Error ? err.message : String(err));
			}
		},
		[request],
	);

	const abort = useCallback(async () => {
		try {
			// Esc semantics: clear the queue first, then abort (returned text kept in editor).
			await request({ type: "clear_queue" });
			await request({ type: "abort" });
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	}, [request]);

	return (
		<div className="app">
			<div className="topbar">
				<input
					placeholder="token"
					value={token}
					onChange={(event) => {
						setToken(event.target.value);
						localStorage.setItem("webpi-token", event.target.value);
					}}
				/>
				<button onClick={() => connect()} disabled={!token}>
					{connected ? "Reconnect" : "Connect"}
				</button>
				<input
					placeholder={`cwd (default: ${allowRoots[0] ?? "gateway allow root"})`}
					list="allow-roots"
					value={cwd}
					onChange={(event) => setCwd(event.target.value)}
				/>
				<datalist id="allow-roots">
					{allowRoots.map((root) => (
						<option key={root} value={root} />
					))}
				</datalist>
				<input placeholder="name" value={name} onChange={(event) => setName(event.target.value)} />
				<button onClick={() => void createSession()} disabled={!connected || hasSession}>
					New session
				</button>
			</div>
			{error ? <div className="error">{error}</div> : null}
			<Transcript items={items} live={live} tools={tools} />
			<Composer disabled={!hasSession || streaming} streaming={streaming} onSend={send} onAbort={abort} />
		</div>
	);
}
