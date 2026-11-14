import { defineComponent } from "@/ecs/defineComponent"

const Material = defineComponent("Material", {
	restitution: "f64",
	friction: "f64",
})

export { Material }
