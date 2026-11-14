# Contributing

## Branches

* `main` holds releases only.
* `dev` is where work comes together.
* All work branches from `dev` and goes back into `dev` through a pull request.

Branch names are `<type>/<kebab-case-description>`, for example `feature/ragdoll-joints` or `fix/circle-inertia`.

| Type | Use for |
|---|---|
| `feature/` | New behaviour |
| `fix/` | Bug fixes |
| `refactor/` | Restructuring without behaviour change |
| `docs/` | Documentation only |
| `test/` | Adding or changing tests |
| `chore/` | Tooling, config and dependencies |
| `migration/` | Porting to another language |

## Commits

Commits follow [Conventional Commits](https://www.conventionalcommits.org/): `<type>: <summary>`.

* Types mirror the branch types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `migration`.
* Write the type in lowercase and the summary in the imperative mood, with no trailing period.

```
feat: add buoyancy force generator
fix: clamp restitution between 0 and 1
docs: add folder readmes
```

## Issues

Open issues with the **Bug report** or **Feature request** template in `.github/ISSUE_TEMPLATE/`.

## Before opening a pull request

The pull request template (`.github/pull_request_template.md`) repeats this checklist.

From `engine-typescript/`, all of these must pass:

```sh
npm run lint
npm run typecheck
npm run build
npm run test
```

`npm run lint` also fails if a folder README is missing a file or lists one that no longer exists. When you add, remove or rename a file, or change what a file does, update its folder's `README.md` in the same change. The check compares names only, so keeping descriptions accurate is on you and the reviewer.

When you add a scene or change how one runs, update the [Scenes](engine-typescript/README.md#scenes) section of `engine-typescript/README.md` in the same change, so users can find its address, what it shows and its controls.

`engine/` is the owner's manual playground. Leave it alone unless the change is specifically about it.
