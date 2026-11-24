import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
const laravel = "http://127.0.0.1:8000";
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        // Prefer the TypeScript source when a leftover compiled .js sits beside it.
        extensions: [".mjs", ".mts", ".ts", ".tsx", ".jsx", ".js", ".json"],
    },
    server: {
        port: 5173,
        proxy: {
            "/api": {
                target: laravel,
                changeOrigin: true,
            },
            "/sanctum": {
                target: laravel,
                changeOrigin: true,
            },
        },
    },
});
