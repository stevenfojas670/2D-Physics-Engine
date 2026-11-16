# tests/benchmark

Benchmarks, run with `npm run bench`.

| File                   | Purpose                                                                                                                                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `physicsStep.bench.ts` | Times one headless ECS update step on the 2,000-body benchmark scene, then prints each system's average time and share for the collapse and settled windows, and how much of the pyramid falls asleep over 3,600 steps |
