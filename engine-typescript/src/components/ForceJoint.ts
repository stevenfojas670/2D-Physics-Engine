import { defineComponent } from "@/ecs/defineComponent"

const ForceJoint = defineComponent("ForceJoint", {
	entityA: "u32",
	entityB: "u32",
	anchorAX: "f64",
	anchorAY: "f64",
	anchorBX: "f64",
	anchorBY: "f64",
	strength: "f64",
})

export { ForceJoint }
