import { defineResource } from "@/ecs/defineResource"

interface SolverSettings {
	velocityIterations: number
	pseudoVelocityIterations: number
	beta: number
	slop: number
	restitutionThreshold: number
}

function createSolverSettings(): SolverSettings {
	return {
		velocityIterations: 8,
		pseudoVelocityIterations: 3,
		beta: 0.2,
		slop: 0.5,
		restitutionThreshold: 20,
	}
}

const SolverSettingsResource = defineResource<SolverSettings>("SolverSettings")

export type { SolverSettings }
export { createSolverSettings, SolverSettingsResource }
