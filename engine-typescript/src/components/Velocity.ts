import { defineComponent } from "@/ecs/defineComponent"

const Velocity = defineComponent("Velocity", {
	x: "f64",
	y: "f64",
	angular: "f64",
})

export { Velocity }
