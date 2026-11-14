import { defineComponent, ref } from "@/ecs/defineComponent"

const Renderable = defineComponent("Renderable", { color: ref<string>() })

export { Renderable }
