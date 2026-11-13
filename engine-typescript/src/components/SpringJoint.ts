import { defineComponent } from "@/ecs/defineComponent"

const SpringJoint = defineComponent("SpringJoint", {
	entityA: "u32",
	entityB: "u32",
	anchorAX: "f64",
	anchorAY: "f64",
	anchorBX: "f64",
	anchorBY: "f64",
	springConstant: "f64",
	restLength: "f64",
	stretchState: "u8",
})

export { SpringJoint }
