import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
	test: {
		include: ["tests/**/*.test.ts"],
		benchmark: {
			include: ["tests/**/*.bench.ts"],
		},
		environment: "node",
	},
})
