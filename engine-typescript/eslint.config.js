import { defineConfig } from "eslint/config"
import js from "@eslint/js"
import tseslint from "typescript-eslint"
import prettier from "eslint-config-prettier"
import globals from "globals"
import { plugin as local } from "./lint/plugin.js"

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
		plugins: { local },
		rules: {
			"local/filename-matches-export": "error",
			"@typescript-eslint/naming-convention": [
				"error",
				{
					selector: "default",
					format: ["camelCase"],
					leadingUnderscore: "forbid",
				},
				{
					selector: "typeLike",
					format: ["PascalCase"],
				},
				{
					selector: "variable",
					modifiers: ["global", "const"],
					format: ["camelCase", "UPPER_CASE", "PascalCase"],
				},
				{
					selector: "enumMember",
					format: ["PascalCase", "UPPER_CASE"],
				},
				{
					selector: ["objectLiteralProperty", "objectLiteralMethod"],
					format: null,
				},
				{
					selector: "typeProperty",
					format: ["camelCase", "PascalCase"],
				},
				{
					selector: "import",
					format: ["camelCase", "PascalCase"],
				},
			],
		},
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
