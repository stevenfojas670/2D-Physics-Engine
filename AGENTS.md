# AGENTS.md

## Map

* `engine-typescript/`: the active TypeScript engine. Every folder has a `README.md` describing each file; start at [`engine-typescript/README.md`](engine-typescript/README.md).
* `engine/`: the owner's playground for manual programming. Do not modify it or add docs to it unless explicitly asked.
* `superpowers/`: design specs in `specs/`, implementation plans in `plans/`.
* [`README.md`](README.md): project overview, the full code rules and the architecture layers.
* [`CONTRIBUTING.md`](CONTRIBUTING.md): branch names, commit messages and pull requests.

## Rules

1. Do not write comments. Make the code explain itself through names and structure; lint rejects every comment.
2. Before calling work done, run `npm run lint`, `npm run typecheck` and `npm run build` in `engine-typescript/`. All three must pass.
3. When you add, remove or rename a file, or change what it does, update its folder's `README.md` in the same change. Lint checks the names; you are responsible for the descriptions.
4. Respect the architecture layers in [`README.md`](README.md#architecture). Never add to the exceptions list in `engine-typescript/lint/layerMap.js` without the owner's approval.
5. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before you branch, commit or open a pull request.
6. Save specs as `superpowers/specs/YYYY-MM-DD-<topic>-design.md` and plans as `superpowers/plans/YYYY-MM-DD-<topic>.md`.
