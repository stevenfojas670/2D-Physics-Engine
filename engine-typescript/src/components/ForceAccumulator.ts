import { defineComponent } from "@/ecs/defineComponent"

const ForceAccumulator = defineComponent("ForceAccumulator", {
	x: "f64",
	y: "f64",
	torque: "f64",
})

export { ForceAccumulator }
