# Physics Performance Phase 0: Per-System Timing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Time every system in the update schedule, in the browser benchmark and headlessly, and record how the 46.25 ms update splits across systems as the baseline for phases 1–4.

**Architecture:** `Schedule` (ecs layer) gets named systems and a `runTimed` method. It takes an injected clock and reports each system's time, including that system's deferred flush. `run` stays untouched. A new app-layer `SystemTimer` averages those times over the same warm-up and sample window as `FrameTimer`, which owns one. `main.ts` shows the five slowest systems in `?scene=benchmark`, and `physicsStep.bench.ts` prints a per-system table.

**Tech Stack:** TypeScript (strict), Vite, Vitest 5 (`npm run test`, `npm run bench`), ESLint with the local `no-comments` and `layers` rules, Prettier (tabs, double quotes, no semicolons).

**Spec:** `superpowers/specs/2026-11-13-physics-performance-design.md`, section "Phase 0: measure per system" (issue #21).

**Recommended execution:** Native (superpowers:executing-plans), with one whole-branch review at the end. There are six small tasks, each building on the previous one's interfaces, and a mistake would only cost a measurement tool, not physics behaviour.

**Owner decision:** put the timing hook on `Schedule` (named systems plus `runTimed`), not an app-layer wrapper.

**Plan location:** this file is `superpowers/plans/2026-11-13-physics-performance-phase-0.md` (AGENTS.md rule 7 overrides the skill's default `docs/` path).

## Global Constraints

- No comments anywhere in code; lint rejects them (AGENTS rule 1).
- Before calling work done: `npm run lint`, `npm run typecheck`, `npm run build` and `npm run test` in `engine-typescript/` all pass (rule 2).
- Every added or changed file is reflected in its folder `README.md` in the same commit (rule 3). If the benchmark's on-screen output changes, update the Scenes section of `engine-typescript/README.md` (rule 4).
- The physics and ecs layers can't use browser globals, so the clock is passed in from the app layer (spec). Don't touch `lint/layerMap.js` exceptions.
- Imports use `@/` across folders and `./` only within a folder. Exports are named. Files exporting one class are named after it.
- Branch `feature/physics-timing` from `dev`. Commits use Conventional Commits, and subjects end with `(#21)`. Every commit ends with the session's Co-Authored-By and Claude-Session lines.
- Tick each plan checkbox as its step finishes, and commit the ticks with the task.
- Timing must not slow the normal path: `Schedule.run` keeps exactly its current loop.

## Review Focus

1. **Scene-only systems added after `createUpdateSchedule`** (the sandbox respawn) must show up in `names`, and the `FrameTimer` must be built after they are added. Covered by the Task 2 test `names include systems added later` and the Task 4 ordering in `main.ts`.
2. **Deferred commands, including ones queued while flushing,** count toward the system that queued them. Covered by the Task 2 test `runTimed counts the deferred flush toward the system that queued it`.
3. **A duplicate system name** would merge two rows silently, so `add` must throw. Covered by the Task 2 test `add rejects a duplicate name`.
4. **Zero total time** (fake clocks, or a schedule with only empty systems) must give a share of `0`, not `NaN`. Covered by the Task 3 test `shares are zero when nothing took time`.
5. **Frames after the sample window** must not change the summary, as with `FrameTimer`. Covered by the Task 3 test `system timer averages after warm-up, slowest first`.

---

### Task 1: Branch and plan file

**Files:**
- Create: `superpowers/plans/2026-11-13-physics-performance-phase-0.md` (this plan)
- Modify: `superpowers/specs/2026-11-13-physics-performance-design.md:64` (Phase 0 status line)

- [ ] **Step 1: Branch from `dev`**

Run: `git switch dev && git pull && git switch -c feature/physics-timing`
Expected: `Switched to a new branch 'feature/physics-timing'`

- [ ] **Step 2: Save this plan to the repo and update the spec status**

Change the spec line to: `**Status:** planned in \`superpowers/plans/2026-11-13-physics-performance-phase-0.md\`. Issue #21.`

- [ ] **Step 3: Commit**

```bash
git add superpowers/plans/2026-11-13-physics-performance-phase-0.md superpowers/specs/2026-11-13-physics-performance-design.md
git commit -m "docs: add phase 0 plan for physics performance (#21)"
```

---

### Task 2: Named systems and `Schedule.runTimed`

**Files:**
- Modify: `engine-typescript/src/ecs/Schedule.ts`
- Modify (callers, to the new `add(name, system)`): `src/app/schedules.ts`, `src/main.ts:67`, `tests/app/app.test.ts:246`, `tests/systems/integration.test.ts:45-47,77-79`, `tests/systems/collision.test.ts:38-43`, `tests/rendering/rendering.test.ts:87-91`
- Modify (docs): `src/ecs/README.md` (Schedule row and the "Schedule and deferred commands" section), `docs/ecs-guide.md` (~lines 120, 192, 200: adding a system takes a name)
- Test: `engine-typescript/tests/ecs/Schedule.test.ts`

**Interfaces:**
- Produces, exported from `@/ecs/Schedule`:
  - `type System = (deltaTime: number) => void` (unchanged)
  - `type Clock = () => number`
  - `type SystemTimed = (systemIndex: number, milliseconds: number) => void`
  - `Schedule.add(name: string, system: System): this`, which throws `Error("Duplicate system name <name>")`
  - `Schedule.names: readonly string[]` (getter, in insertion order; `systemIndex` in `SystemTimed` indexes into it)
  - `Schedule.run(world: World, deltaTime: number): void` (unchanged behaviour)
  - `Schedule.runTimed(world: World, deltaTime: number, clock: Clock, onSystemTimed: SystemTimed): void`
- System names (camelCase, factory name without `create`/`System`). Update: `playerInput, mouseDrag, intentForce, gravity, wind, jointForce, rigidBodyIntegration, particleIntegration, colliderTransform, broadPhase, collisionSolver`. Render: `colliderRender, jointRender, debugDraw, drawFlush`. Sandbox: `sandboxRespawn`.

- [ ] **Step 1: Write the failing tests**

Rewrite the two existing tests to call `.add("a", ...)` and `.add("b", ...)`, and add:

```ts
test("names include systems added later", () => {
	const schedule = new Schedule().add("a", () => {}).add("b", () => {})
	schedule.add("c", () => {})
	expect(schedule.names).toEqual(["a", "b", "c"])
})

test("add rejects a duplicate name", () => {
	const schedule = new Schedule().add("a", () => {})
	expect(() => schedule.add("a", () => {})).toThrow("Duplicate system name a")
})

test("runTimed counts the deferred flush toward the system that queued it", () => {
	const world = new World()
	let now = 0
	const timings: [number, number][] = []
	const schedule = new Schedule()
		.add("a", () => {
			now += 2
			world.defer(() => {
				now += 1
				world.defer(() => {
					now += 4
				})
			})
		})
		.add("b", () => {
			now += 5
		})
	schedule.runTimed(world, 0, () => now, (index, ms) => timings.push([index, ms]))
	expect(timings).toEqual([[0, 7], [1, 5]])
})

test("runTimed passes deltaTime and keeps order", () => {
	const log: string[] = []
	const schedule = new Schedule()
		.add("a", (deltaTime) => log.push(`a${deltaTime}`))
		.add("b", (deltaTime) => log.push(`b${deltaTime}`))
	schedule.runTimed(new World(), 0.5, () => 0, () => {})
	expect(log).toEqual(["a0.5", "b0.5"])
})
```

- [ ] **Step 2: Run the tests and check they fail**

Run: `npx vitest run tests/ecs/Schedule.test.ts`
Expected: FAIL. The new tests error on the missing `names`/`runTimed`, and typecheck reports `add` arity.

- [ ] **Step 3: Implement in `src/ecs/Schedule.ts`**

Keep a parallel `systemNames: string[]` beside `systems`. `runTimed` uses an indexed loop: `start = clock()`, then the system, `world.flushDeferred()`, then `onSystemTimed(index, clock() - start)`. Don't change `run`.

- [ ] **Step 4: Update every caller to named `add`**

Use the names from the Interfaces block. In the test helpers, use the same names as the systems they add.

- [ ] **Step 5: Run the tests and check they pass**

Run: `npm run typecheck && npx vitest run`
Expected: typecheck clean; all tests PASS.

- [ ] **Step 6: Update the docs**

`src/ecs/README.md`: Schedule row reads "An ordered list of named systems; runs them and applies deferred changes after each, optionally timing each with a supplied clock". In the section text, say that `runTimed` measures each system plus its flush with a clock passed in, because ecs can't use browser globals. `docs/ecs-guide.md`: show `.add("wind", createWindSystem(world))` wherever adding a system is described.

- [ ] **Step 7: Lint, then commit**

Run: `npm run lint`. Expected: no errors.

```bash
git add engine-typescript/src engine-typescript/tests engine-typescript/docs superpowers/plans
git commit -m "feat: name schedule systems and time them one by one (#21)"
```

---

### Task 3: `SystemTimer` and `FrameTimer` per-system averages

**Files:**
- Create: `engine-typescript/src/app/SystemTimer.ts`
- Modify: `engine-typescript/src/app/FrameTimer.ts`
- Modify: `engine-typescript/src/app/README.md` (add the `SystemTimer.ts` row; update the `FrameTimer.ts` and `schedules.ts` rows: "named systems")
- Test: `engine-typescript/tests/app/app.test.ts` (`describe("frame timer")`)

**Interfaces:**
- Consumes: `SystemTimed` from `@/ecs/Schedule` (Task 2).
- Produces, from `@/app/SystemTimer`:
  - `interface SystemTime { name: string; milliseconds: number; share: number }`. `share` is `milliseconds / sum of all systems' milliseconds`, or `0` when the sum is `0`.
  - `class SystemTimer`:
    - `constructor(names: readonly string[], warmupFrames = 60, sampleFrames = 300)`
    - `readonly recordSystem: SystemTimed`, an arrow-function property that adds into a `Float64Array` of totals only while the frame is inside the sample window. It allocates nothing.
    - `endFrame(): void`
    - `get ready(): boolean`
    - `get summary(): SystemTime[] | null`, which averages over `sampleFrames`, sorts by `milliseconds` descending, and is `null` until ready.
- Produces, from `@/app/FrameTimer`:
  - `constructor(systemNames: readonly string[], warmupFrames = 60, sampleFrames = 300)`, which builds a `SystemTimer` with the same window.
  - `readonly recordSystem: SystemTimed`, which forwards to the inner timer.
  - `record(...)` keeps its signature and also calls the inner `endFrame()`.
  - `FrameSummary` gains `systems: SystemTime[]`.

- [ ] **Step 1: Write the failing tests**

Update the existing test to `new FrameTimer([], 2, 3)` with `systems: []` in both `toEqual` objects, and add:

```ts
test("system timer averages after warm-up, slowest first", () => {
	const timer = new SystemTimer(["a", "b"], 1, 2)
	timer.recordSystem(0, 100)
	timer.recordSystem(1, 100)
	timer.endFrame()
	timer.recordSystem(0, 1)
	timer.recordSystem(1, 6)
	timer.endFrame()
	expect(timer.summary).toBeNull()
	timer.recordSystem(0, 3)
	timer.recordSystem(1, 2)
	timer.endFrame()
	expect(timer.ready).toBe(true)
	const expected = [
		{ name: "b", milliseconds: 4, share: 4 / 6 },
		{ name: "a", milliseconds: 2, share: 2 / 6 },
	]
	expect(timer.summary).toEqual(expected)
	timer.recordSystem(0, 1000)
	timer.endFrame()
	expect(timer.summary).toEqual(expected)
})

test("shares are zero when nothing took time", () => {
	const timer = new SystemTimer(["a"], 0, 1)
	timer.recordSystem(0, 0)
	timer.endFrame()
	expect(timer.summary).toEqual([{ name: "a", milliseconds: 0, share: 0 }])
})

test("frame timer reports per-system averages with its summary", () => {
	const timer = new FrameTimer(["gravity"], 0, 1)
	timer.recordSystem(0, 2)
	timer.record(5, 1, 3)
	expect(timer.summary?.systems).toEqual([
		{ name: "gravity", milliseconds: 2, share: 1 },
	])
})
```

- [ ] **Step 2: Run the tests and check they fail**

Run: `npx vitest run tests/app/app.test.ts -t "timer"`
Expected: FAIL, because `SystemTimer` can't be resolved.

- [ ] **Step 3: Implement `SystemTimer` in `src/app/SystemTimer.ts`, then extend `FrameTimer`**

`FrameTimer.ready` stays based on its own frame count. Both timers count frames through `record`/`endFrame`, so they stay in step.

- [ ] **Step 4: Run the tests and check they pass**

Run: `npx vitest run tests/app/app.test.ts`
Expected: PASS. `main.ts` won't typecheck until Task 4. If `npm run typecheck` flags `new FrameTimer()` there, make the one-line change `new FrameTimer(update.names)` now and keep the rest for Task 4.

- [ ] **Step 5: Update the app README, lint and commit**

`SystemTimer.ts` row: "Averages each named system's time over a fixed number of frames after a warm-up, slowest first, with each one's share of the total". `FrameTimer.ts` row: add "and per-system times through a `SystemTimer`".

Run: `npm run lint && npm run typecheck`. Expected: clean.

```bash
git add engine-typescript/src/app engine-typescript/tests/app superpowers/plans
git commit -m "feat: average per-system times in the frame timer (#21)"
```

---

### Task 4: Show the slowest systems in the benchmark scene

**Files:**
- Modify: `engine-typescript/src/main.ts:65-145`
- Modify: `engine-typescript/README.md` (Scenes table, Benchmark row)

**Interfaces:**
- Consumes: `Schedule.runTimed` and `Schedule.names` (Task 2); `FrameTimer(systemNames)`, `FrameTimer.recordSystem` and `FrameSummary.systems` (Task 3).

- [ ] **Step 1: Wire the timed run**

Build `const frameTimer = new FrameTimer(update.names)` after the sandbox `update.add("sandboxRespawn", ...)`. In `runFrame`, the benchmark calls `update.runTimed(world, BENCHMARK_STEP, readClock, frameTimer.recordSystem)` with a module-level `const readClock = (): number => performance.now()`. Every other scene keeps `update.run(world, deltaTime)`.

- [ ] **Step 2: Draw the top systems**

Add constants `TOP_SYSTEM_COUNT = 5`, `SYSTEM_LINES_TOP = 60` and `LINE_HEIGHT = 15`. Once the summary exists, draw the first `TOP_SYSTEM_COUNT` entries of `summary.systems` one per line, as `` `${name} ${milliseconds.toFixed(2)} ms · ${Math.round(share * 100)}%` ``. Keep it in a `drawSystemLines(systems: SystemTime[])` function next to `benchmarkText`.

- [ ] **Step 3: Check it in the browser**

Run: `npm run dev` and open `http://localhost:5173/?scene=benchmark`.
Expected: "measuring..." for about 6 s, then the summary line and five lines like `collisionSolver NN.NN ms · NN%`. `/` and `/?scene=sandbox` behave as before.

- [ ] **Step 4: Update the Scenes section**

Append to the Benchmark row's "What it shows" cell: "…, then lists the five slowest update systems with their average ms and share of the update".

- [ ] **Step 5: Verify and commit**

Run: `npm run lint && npm run typecheck && npm run build && npm run test`. Expected: all pass.

```bash
git add engine-typescript/src/main.ts engine-typescript/README.md superpowers/plans
git commit -m "feat: show slowest systems in the benchmark scene (#21)"
```

---

### Task 5: Headless per-system report

**Files:**
- Modify: `engine-typescript/tests/benchmark/physicsStep.bench.ts`
- Modify: `engine-typescript/tests/benchmark/README.md`, plus the `npm run bench` sentence under Scenes in `engine-typescript/README.md`

**Interfaces:**
- Consumes: `createUpdateSchedule`, `Schedule.runTimed`/`names` (Task 2) and `SystemTimer` (Task 3).

- [ ] **Step 1: Add the per-system test**

Keep `test("physics step", ...)` as it is. Add `test("per-system step times", ...)`: `benchmarkWorld()`, `createUpdateSchedule(world)` and `WARMUP_STEPS` untimed `run` calls. Then `new SystemTimer(update.names, 0, SAMPLE_STEPS)` with `SAMPLE_STEPS = 300`, and `SAMPLE_STEPS` iterations of `runTimed(world, STEP, () => performance.now(), timer.recordSystem)` followed by `timer.endFrame()`. Finally `expect(timer.summary).not.toBeNull()` and `console.table` of rows `{ system, ms: ms.toFixed(3), share: \`${(share * 100).toFixed(1)}%\` }`, plus a `total` row.

- [ ] **Step 2: Run the bench and check the table prints**

Run: `npm run bench`
Expected: the existing `ecs physics step, 2000 bodies` result, then a table with all 11 update systems, slowest first. If the verbose reporter hides `console.table`, switch to `process.stdout.write` of the same rows, one per line.

- [ ] **Step 3: Update the READMEs and commit**

`tests/benchmark/README.md` row: "Times one headless ECS update step on the 2,000-body benchmark scene, then prints each system's average time and share". Scenes sentence: "`npm run bench` times one physics step of the benchmark scene without a browser and prints a per-system breakdown."

Run: `npm run lint && npm run test`. Expected: pass.

```bash
git add engine-typescript/tests/benchmark engine-typescript/README.md superpowers/plans
git commit -m "test: report per-system times in the physics benchmark (#21)"
```

---

### Task 6: Record the baseline

**Files:**
- Modify: `superpowers/specs/2026-11-13-physics-performance-design.md` (Phase 0 status, `### Results`)

- [ ] **Step 1: Headless numbers**

Run: `npm run bench` twice. Expected: the two runs agree within about 10%. Note the step mean and the per-system table.

- [ ] **Step 2: Browser numbers from the owner**

Ask the owner to open `?scene=benchmark` in Brave on the same machine as the baseline, and to report the update ms, render ms and the five system lines.

- [ ] **Step 3: Fill in the spec**

In the Phase 0 Results row, add the browser update ms, headless step ms, solver ms (`collisionSolver`) and broad phase ms (`broadPhase`), with the machine and browser in Notes. Under the table, add `#### Phase 0 baseline split`: a table of every update system with its headless ms and %, and browser ms and % for the top five. Set Phase 0 **Status** to `done. Issue #21.`

- [ ] **Step 4: Full verification**

Run, in `engine-typescript/`: `npm run lint && npm run typecheck && npm run build && npm run test`. Expected: all four pass.

- [ ] **Step 5: Commit, push and open the PR after the owner confirms**

```bash
git add superpowers
git commit -m "docs: record phase 0 per-system baseline (#21)"
git push -u origin feature/physics-timing
```

Open a PR into `dev` using `.github/pull_request_template.md` that closes #21, and include the baseline table.
