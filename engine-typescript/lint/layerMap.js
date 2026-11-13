const layers = [
	{ name: "math", files: ["Vector2.ts", "utils/MathHelper.ts"] },
	{ name: "rendering", files: ["utils/DrawUtils.ts"] },
	{ name: "input", files: ["Controller.ts"] },
	{ name: "app", files: ["main.ts"] },
	{ name: "types", files: ["types/**"] },
	{
		name: "physics",
		files: [
			"RigidBody.ts",
			"StaticBody.ts",
			"Simulation.ts",
			"shapes/**",
			"collisionDetectionSystem/**",
			"joints/**",
			"materials/**",
			"particles/**",
			"optimizations/**",
		],
	},
]

const allowedImports = {
	math: ["math", "types"],
	physics: ["physics", "math", "types"],
	rendering: ["rendering", "physics", "math", "types"],
	input: ["input", "types"],
	app: ["app", "physics", "rendering", "input", "math", "types"],
	types: ["types"],
}

const exceptions = [
	{ from: "shapes/Shape.ts", to: "utils/DrawUtils.ts" },
	{ from: "shapes/Circle.ts", to: "utils/DrawUtils.ts" },
	{ from: "shapes/Polygon.ts", to: "utils/DrawUtils.ts" },
	{
		from: "collisionDetectionSystem/CollisionManifold.ts",
		to: "utils/DrawUtils.ts",
	},
	{ from: "joints/JointConnection.ts", to: "utils/DrawUtils.ts" },
	{ from: "optimizations/grids/SpatialGrid.ts", to: "utils/DrawUtils.ts" },
	{ from: "Simulation.ts", to: "utils/DrawUtils.ts" },
	{ from: "Simulation.ts", to: "Controller.ts" },
]

export { layers, allowedImports, exceptions }
