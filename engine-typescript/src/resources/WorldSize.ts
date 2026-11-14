import { defineResource } from "@/ecs/defineResource"

interface WorldSize {
	width: number
	height: number
}

const WorldSizeResource = defineResource<WorldSize>("WorldSize")

export type { WorldSize }
export { WorldSizeResource }
