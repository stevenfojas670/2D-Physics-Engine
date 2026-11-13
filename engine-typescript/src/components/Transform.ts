import { defineComponent } from "@/ecs/defineComponent"

const Transform = defineComponent("Transform", {
	x: "f64",
	y: "f64",
	angle: "f64",
})

export { Transform }
