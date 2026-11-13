import { defineComponent } from "@/ecs/defineComponent"

const Sleep = defineComponent("Sleep", {
	linearThreshold: "f64",
	angularThreshold: "f64",
})

export { Sleep }
