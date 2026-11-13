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
			"local/no-comments": "error",
			"no-restricted-syntax": [
				"error",
				{
					selector: "ExportDefaultDeclaration",
					message: "Use named exports.",
				},
			],
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
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{ regex: "^\\.\\./", message: "Use the @/ alias." },
						{
							regex: "^\\./.+/",
							message: "./ is only for same-folder imports; use @/.",
						},
					],
				},
			],
			"local/layers": "error",
		},
	},
	{
		files: [
			"src/Vector2.ts",
			"src/utils/MathHelper.ts",
			"src/RigidBody.ts",
			"src/StaticBody.ts",
			"src/Simulation.ts",
			"src/shapes/**",
			"src/collisionDetectionSystem/**",
			"src/joints/**",
			"src/materials/**",
			"src/particles/**",
			"src/optimizations/**",
		],
		rules: {
			"no-restricted-globals": [
				"error",
				"window",
				"document",
				"requestAnimationFrame",
				"navigator",
			],
		},
	},
	{
		files: ["*.{ts,js,mjs}", "scripts/**/*.{ts,js,mjs}", "lint/**/*.js"],
		languageOptions: {
			globals: globals.node,
		},
	},
	{
		files: ["vite.config.ts", "eslint.config.js"],
		rules: {
			"no-restricted-syntax": "off",
		},
	},
	prettier,
)
