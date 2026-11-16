import { defineResource } from "@/ecs/defineResource"

interface SleepSettings {
	enabled: boolean
	linearThreshold: number
	angularThreshold: number
	timeout: number
}

function createSleepSettings(): SleepSettings {
	return {
		enabled: true,
		linearThreshold: 1,
		angularThreshold: 0.035,
		timeout: 0.5,
	}
}

const SleepSettingsResource = defineResource<SleepSettings>("SleepSettings")

export type { SleepSettings }
export { createSleepSettings, SleepSettingsResource }
