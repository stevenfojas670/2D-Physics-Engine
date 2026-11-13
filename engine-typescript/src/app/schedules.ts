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
import { createMouseDragSystem } from "./MouseDragSystem"
import { createPlayerInputSystem } from "./PlayerInputSystem"

function createUpdateSchedule(world: World): Schedule {
	return new Schedule()
		.add(createPlayerInputSystem(world))
		.add(createMouseDragSystem(world))
		.add(createIntentForceSystem(world))
		.add(createGravitySystem(world))
		.add(createJointForceSystem(world))
		.add(createRigidBodyIntegrationSystem(world))
		.add(createParticleIntegrationSystem(world))
		.add(createColliderTransformSystem(world))
		.add(createBroadPhaseSystem(world))
		.add(createCollisionSolverSystem(world))
}

function createRenderSchedule(world: World): Schedule {
	return new Schedule()
		.add(createColliderRenderSystem(world))
		.add(createJointRenderSystem(world))
		.add(createDebugDrawSystem(world))
		.add(createDrawFlushSystem(world))
}

export { createUpdateSchedule, createRenderSchedule }
