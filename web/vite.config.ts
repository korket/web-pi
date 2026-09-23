import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	server: {
		fs: {
			// shared/protocol.ts lives one level up from the web workspace.
			allow: [".."],
		},
	},
});
