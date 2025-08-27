import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

console.log("--- Vite config loaded! Proxy should be active. ---");

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	server: {
		proxy: {
			// Proxy requests from /api to your backend server
			"/api": {
				target: "http://localhost:8000", // Your FastAPI server address
				changeOrigin: true, // Recommended for virtual hosts
				secure: false, // Recommended for http
			},
		},
	},
});
