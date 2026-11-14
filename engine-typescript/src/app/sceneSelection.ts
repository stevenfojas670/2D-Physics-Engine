type SceneName = "demo" | "benchmark" | "sandbox"

const SELECTABLE_SCENES: readonly SceneName[] = ["benchmark", "sandbox"]

function isSelectableScene(value: string | null): value is SceneName {
	return SELECTABLE_SCENES.some((scene) => scene === value)
}

function selectScene(search: string): SceneName {
	const requested = new URLSearchParams(search).get("scene")
	return isSelectableScene(requested) ? requested : "demo"
}

export type { SceneName }
export { selectScene }
