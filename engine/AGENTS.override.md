# AGENTS.override.md

## Rules

- Use JSDoc standards to document code

## Directory Structure

- `joints/` - Joint and constraint implementations used to connect simulated bodies.
- `optimizations/` - Broad-phase and spatial optimization helpers for collision and lookup performance.
- `particles/` - Particle system code and related simulation behavior.
- `Player/` - Player-specific logic and control code.
- `shapes/` - Shape hierarchy, including base shape logic and concrete primitives.
- `utils/` - Shared utility helpers used across the engine.
- `CollisionDetection.js` - Collision detection routines for shape intersections.
- `CollisionManifold.js` - Collision manifold generation and contact data handling.
- `index.html` - Browser entry HTML for the engine demo/app.
- `main.js` - Main JavaScript entry point that boots the application.
- `Material.js` - Material definitions and shared physical surface properties.
- `pfgen.js` - Force or particle-generation related runtime logic.
- `Rigidbody.js` - Dynamic rigid body implementation.
- `simulation.js` - Main simulation loop and world update orchestration.
- `StaticBody.js` - Static body implementation for immovable colliders.
- `styles.css` - Global styling for the browser demo/app.
- `tsconfig.json` - TypeScript configuration retained for project tooling or migration support.
- `Vector2.js` - Core 2D vector math type and helper operations.
- `Vector3.js` - 3D vector utility type and helper operations.
