# AGENTS.override.md

## Rules

- Use TSDoc standards to document code

## Directory Structure

- `public/` - Static assets served directly by Vite, including shared SVG files like `favicon.svg` and `icons.svg`.
- `src/` - Main TypeScript source tree for the engine and demo application.
- `src/assets/` - Project-owned runtime assets imported by the application.
- `src/collisionDetectionSystem/` - Narrow-phase collision detection and collision-manifold resolution code.
- `src/joints/` - Joint and constraint implementations that connect rigid bodies.
- `src/materials/` - Material definitions and surface-property logic used by physics bodies.
- `src/optimizations/` - Spatial partitioning and broad-phase optimization code.
- `src/optimizations/boundingVolumes/` - Bounding volume implementations used for collision culling.
- `src/optimizations/grids/` - Grid-based partitioning and lookup structures.
- `src/particles/` - Particle simulation types and related behavior.
- `src/shapes/` - Shape hierarchy, including base shape types and polygonal primitives.
- `src/types/` - Shared TypeScript type declarations and interfaces.
- `src/types/collisionGroups/` - Collision-group and collision-mask type definitions.
- `src/types/controller/` - Controller input-state type definitions.
- `src/types/grid/` - Grid selection and grid-related type definitions.
- `src/utils/` - Reusable utility helpers such as math and drawing helpers.
- `src/Controller.ts` - Input/control orchestration for the simulation.
- `src/main.ts` - Vite entry point that boots the application.
- `src/Rigidbody.ts` - Dynamic rigid body implementation.
- `src/Simulation.ts` - Main simulation loop and world management.
- `src/Staticbody.ts` - Static body implementation for immovable colliders.
- `src/style.css` - Global application styling.
- `src/Vector2.ts` - Core 2D vector math type and helpers.
- `index.html` - Root HTML shell used by the Vite app.
- `package.json` - Project scripts and dependency manifest.
- `tsconfig.json` - TypeScript compiler configuration.
- `vite.config.ts` - Vite build and dev-server configuration.
