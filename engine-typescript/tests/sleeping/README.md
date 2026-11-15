# tests/sleeping

Tests for `src/sleeping/`.

| File                 | Purpose                                                                                                                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wakeBodies.test.ts` | Falling asleep zeroes motion and records the group, waking one member wakes the group, timers reset at once, recycled entities stay asleep, waking everything, and waking by overlap with its margin |
