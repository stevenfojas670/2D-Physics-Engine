const layers = [
	{ name: "ecs", files: ["ecs/**"] },
	{ name: "math", files: ["Vector2.ts", "utils/MathHelper.ts"] },
	{ name: "rendering", files: ["rendering/**"] },
	{ name: "input", files: ["Controller.ts"] },
	{ name: "app", files: ["main.ts", "app/**"] },
	{ name: "types", files: ["types/**"] },
	{
		name: "physics",
		files: [
			"components/**",
			"resources/**",
			"systems/**",
			"shapes/**",
			"collisionDetectionSystem/**",
			"joints/**",
			"materials/**",
			"optimizations/**",
		],
	},
]

const allowedImports = {
	ecs: ["ecs", "types"],
	math: ["math", "types"],
	physics: ["physics", "ecs", "math", "types"],
	rendering: ["rendering", "physics", "ecs", "math", "types"],
	input: ["input", "types"],
	app: ["app", "ecs", "physics", "rendering", "input", "math", "types"],
	types: ["types"],
}

const exceptions = []

export { layers, allowedImports, exceptions }
