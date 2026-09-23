import { useState } from "react";

interface ComposerProps {
	disabled: boolean;
	streaming: boolean;
	onSend: (text: string) => void | Promise<void>;
	onAbort: () => void | Promise<void>;
}

export function Composer({ disabled, streaming, onSend, onAbort }: ComposerProps) {
	const [text, setText] = useState("");

	async function submit(): Promise<void> {
		const value = text.trim();
		if (!value || disabled) return;
		setText("");
		await onSend(value);
	}

	return (
		<div className="composer">
			<textarea
				placeholder="Message Pi (Enter send, Shift+Enter newline)"
				value={text}
				disabled={disabled && !streaming}
				onChange={(event) => setText(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === "Enter" && !event.shiftKey) {
						event.preventDefault();
						void submit();
					}
				}}
			/>
			{streaming ? (
				<button onClick={() => void onAbort()}>Abort</button>
			) : (
				<button onClick={() => void submit()} disabled={disabled || !text.trim()}>
					Send
				</button>
			)}
		</div>
	);
}
