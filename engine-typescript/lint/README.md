# lint

Local ESLint plugin holding this project's own rules. Registered in `eslint.config.js` under the `local/` prefix.

| File                       | Purpose                                                                                                                          |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `filenameMatchesExport.js` | Rule `local/filename-matches-export`: a file exporting one class is named after it, and files in `src/types/` end in `.types.ts` |
| `layerMap.js`              | Which `src/` files belong to which architecture layer, which layers may import which, and the temporary exceptions               |
| `layers.js`                | Rule `local/layers`: reports imports that cross layers in a direction `layerMap.js` does not allow                               |
| `noComments.js`            | Rule `local/no-comments`: reports every comment                                                                                  |
| `plugin.js`                | Bundles the rules into the `local` plugin                                                                                        |
