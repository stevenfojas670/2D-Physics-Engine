import { Schedule } from "@/ecs/Schedule"
import type { World } from "@/ecs/World"
import { createColliderRenderSystem } from "@/rendering/ColliderRenderSystem"
import { createDebugDrawSystem } from "@/rendering/DebugDrawSystem"
import { createDrawFlushSystem } from "@/rendering/DrawFlushSystem"
import { createJointRenderSystem } from "@/rendering/JointRenderSystem"
import { createBroadPhaseSystem } from "@/systems/BroadPhaseSystem"
import { createColliderTransformSystem } from "@/systems/ColliderTransformSystem"
import { createCollisionSolverSystem } from "@/systems/CollisionSolverSystem"
import { createGravitySystem } from "@/systems/GravitySystem"
import { createIntentForceSystem } from "@/systems/IntentForceSystem"
import { createJointForceSystem } from "@/systems/JointForceSystem"
import { createParticleIntegrationSystem } from "@/systems/ParticleIntegrationSystem"
import { createRigidBodyIntegrationSystem } from "@/systems/RigidBodyIntegrationSystem"
import { createWindSystem } from "@/systems/WindSystem"
import { createMouseDragSystem } from "./MouseDragSystem"
import { createPlayerInputSystem } from "./PlayerInputSystem"

function createUpdateSchedule(world: World): Schedule {
	return new Schedule()
		.add("playerInput", createPlayerInputSystem(world))
		.add("mouseDrag", createMouseDragSystem(world))
		.add("intentForce", createIntentForceSystem(world))
		.add("gravity", createGravitySystem(world))
		.add("wind", createWindSystem(world))
		.add("jointForce", createJointForceSystem(world))
		.add("rigidBodyIntegration", createRigidBodyIntegrationSystem(world))
		.add("particleIntegration", createParticleIntegrationSystem(world))
		.add("colliderTransform", createColliderTransformSystem(world))
		.add("broadPhase", createBroadPhaseSystem(world))
		.add("collisionSolver", createCollisionSolverSystem(world))
}

function createRenderSchedule(world: World): Schedule {
	return new Schedule()
		.add("colliderRender", createColliderRenderSystem(world))
		.add("jointRender", createJointRenderSystem(world))
		.add("debugDraw", createDebugDrawSystem(world))
		.add("drawFlush", createDrawFlushSystem(world))
}

export { createUpdateSchedule, createRenderSchedule }
