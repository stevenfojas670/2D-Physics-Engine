# utils

Math helpers and canvas drawing helpers.

| File            | Purpose                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| `DrawUtils.ts`  | Static canvas helpers: filled point, outlined point, line, rectangle, text and arrow. Layer: rendering     |
| `MathHelper.ts` | Polygon centroid and area, index wrapping, clamping, rotation around a point and edge normals. Layer: math |

## References

`MathHelper` centroid and area use the shoelace formula: [Polygon (Wikipedia)](https://en.wikipedia.org/wiki/Polygon).
