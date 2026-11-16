type SceneName = "demo" | "benchmark" | "sandbox"
type BenchmarkWindow = "collapse" | "settled"
type BenchmarkLayout = "falling" | "standing"

const SELECTABLE_SCENES: readonly SceneName[] = ["benchmark", "sandbox"]

function isSelectableScene(value: string | null): value is SceneName {
	return SELECTABLE_SCENES.some((scene) => scene === value)
}

function selectScene(search: string): SceneName {
	const requested = new URLSearchParams(search).get("scene")
	return isSelectableScene(requested) ? requested : "demo"
}

function selectBenchmarkWindow(search: string): BenchmarkWindow {
	return new URLSearchParams(search).get("window") === "settled"
		? "settled"
		: "collapse"
}

function selectBenchmarkLayout(search: string): BenchmarkLayout {
	return new URLSearchParams(search).get("pyramid") === "standing"
		? "standing"
		: "falling"
}

export type { BenchmarkLayout, BenchmarkWindow, SceneName }
export { selectBenchmarkLayout, selectBenchmarkWindow, selectScene }
