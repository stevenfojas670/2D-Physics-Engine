import { defineComponent } from "@/ecs/defineComponent"

const LinearDamping = defineComponent("LinearDamping", {
	linear: "f64",
	angular: "f64",
})

export { LinearDamping }
