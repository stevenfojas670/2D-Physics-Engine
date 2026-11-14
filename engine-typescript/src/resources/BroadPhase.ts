import { defineResource } from "@/ecs/defineResource"
import type { BroadPhaseGrid } from "@/optimizations/broadPhase/BroadPhaseGrid"

const BroadPhaseResource = defineResource<BroadPhaseGrid>("BroadPhase")

export { BroadPhaseResource }
