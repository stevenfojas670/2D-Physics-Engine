import { defineComponent } from "@/ecs/defineComponent"
import { COLLIDER_SCHEMA } from "@/shapes/colliderGeometry"

const Collider = defineComponent("Collider", COLLIDER_SCHEMA)

export { Collider }
