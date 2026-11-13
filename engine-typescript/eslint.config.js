import { defineConfig } from "eslint/config"
import js from "@eslint/js"
import tseslint from "typescript-eslint"
import prettier from "eslint-config-prettier"
import globals from "globals"

export default defineConfig(
	{
		ignores: ["dist", "node_modules"],
	},
	{
		linterOptions: {
			noInlineConfig: true,
			reportUnusedDisableDirectives: "error",
		},
	},
	{
		files: ["**/*.{ts,js,mjs}"],
		extends: [js.configs.recommended, tseslint.configs.recommended],
	},
	{
		files: ["src/**/*.{ts,js,mjs}"],
		languageOptions: {
			globals: globals.browser,
		},
	},
	{
		files: ["*.{ts,js,mjs}", "scripts/**/*.{ts,js,mjs}"],
		languageOptions: {
			globals: globals.node,
		},
	},
	prettier,
)
