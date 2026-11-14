import { defineComponent } from "@/ecs/defineComponent"

const Mass = defineComponent("Mass", {
	mass: "f64",
	inverseMass: "f64",
	inertia: "f64",
	inverseInertia: "f64",
})

export { Mass }
