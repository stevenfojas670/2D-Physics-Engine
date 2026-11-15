# tests/collision

Tests for `src/collisionDetectionSystem/`.

| File                        | Purpose                                                                                                                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `narrowPhase.test.ts`       | Hits, misses, depths and normals for circle, box and mixed pairs, two-point and clipped box manifolds, and stable feature IDs                                                                 |
| `sequentialImpulse.test.ts` | Bounces, restitution 0 and the threshold, friction capped at mu in both directions, warm starting, immovable bodies, friction arrows, the two-point block solve, and split impulses with slop |
