import { defineComponent } from "@/ecs/defineComponent"

const MovementIntent = defineComponent("MovementIntent", {
	x: "f64",
	y: "f64",
	jump: "u8",
})

export { MovementIntent }
