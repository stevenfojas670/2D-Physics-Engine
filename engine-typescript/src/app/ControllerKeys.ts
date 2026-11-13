import { defineResource } from "@/ecs/defineResource"
import type { ControllerKeys } from "@/types/controller/controller.types"

const ControllerKeysResource = defineResource<ControllerKeys>("ControllerKeys")

export { ControllerKeysResource }
