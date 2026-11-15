import { defineComponent } from "@/ecs/defineComponent"

const SleepTimer = defineComponent("SleepTimer", {
	sleepTime: "f64",
})

export { SleepTimer }
