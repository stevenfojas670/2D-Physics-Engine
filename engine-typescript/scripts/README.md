# scripts

Node scripts run by npm scripts.

| File               | Purpose                                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `checkReadmes.mjs` | Fails `npm run lint` when a folder README is missing, omits a file or folder, or lists one that no longer exists |

The check compares names only. It cannot tell whether a description is still accurate, so when a file's purpose changes, update its line by hand; reviewers check this in the pull request checklist.
