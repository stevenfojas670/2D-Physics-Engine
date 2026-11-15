import { Schedule } from "@/ecs/Schedule"
import type { World } from "@/ecs/World"
import { createColliderRenderSystem } from "@/rendering/ColliderRenderSystem"
import { createDebugDrawSystem } from "@/rendering/DebugDrawSystem"
import { createDrawFlushSystem } from "@/rendering/DrawFlushSystem"
import { createJointRenderSystem } from "@/rendering/JointRenderSystem"
import { createBroadPhaseSystem } from "@/systems/BroadPhaseSystem"
import { createColliderTransformSystem } from "@/systems/ColliderTransformSystem"
import { createContactDetectionSystem } from "@/systems/ContactDetectionSystem"
import { createGravitySystem } from "@/systems/GravitySystem"
import { createIntentForceSystem } from "@/systems/IntentForceSystem"
import { createIslandSystem } from "@/systems/IslandSystem"
import { createJointForceSystem } from "@/systems/JointForceSystem"
import { createParticleIntegrationSystem } from "@/systems/ParticleIntegrationSystem"
import { createPositionIntegrationSystem } from "@/systems/PositionIntegrationSystem"
import { createPseudoVelocitySolveSystem } from "@/systems/PseudoVelocitySolveSystem"
import { createSleepSystem } from "@/systems/SleepSystem"
import { createVelocityIntegrationSystem } from "@/systems/VelocityIntegrationSystem"
import { createVelocitySolveSystem } from "@/systems/VelocitySolveSystem"
import { createWindSystem } from "@/systems/WindSystem"
import { createWorldChangeWakeSystem } from "@/systems/WorldChangeWakeSystem"
import { createMouseDragSystem } from "./MouseDragSystem"
import { createPlayerInputSystem } from "./PlayerInputSystem"

function createUpdateSchedule(world: World): Schedule {
	return new Schedule()
		.add("wakeOnWorldChange", createWorldChangeWakeSystem(world))
		.add("playerInput", createPlayerInputSystem(world))
		.add("mouseDrag", createMouseDragSystem(world))
		.add("intentForce", createIntentForceSystem(world))
		.add("gravity", createGravitySystem(world))
		.add("wind", createWindSystem(world))
		.add("jointForce", createJointForceSystem(world))
		.add("velocityIntegration", createVelocityIntegrationSystem(world))
		.add("particleIntegration", createParticleIntegrationSystem(world))
		.add("broadPhase", createBroadPhaseSystem(world))
		.add("contactDetection", createContactDetectionSystem(world))
		.add("islands", createIslandSystem(world))
		.add("velocitySolve", createVelocitySolveSystem(world))
		.add("pseudoVelocitySolve", createPseudoVelocitySolveSystem(world))
		.add("positionIntegration", createPositionIntegrationSystem(world))
		.add("colliderTransform", createColliderTransformSystem(world))
		.add("sleep", createSleepSystem(world))
}

function createRenderSchedule(world: World): Schedule {
	return new Schedule()
		.add("colliderRender", createColliderRenderSystem(world))
		.add("jointRender", createJointRenderSystem(world))
		.add("debugDraw", createDebugDrawSystem(world))
		.add("drawFlush", createDrawFlushSystem(world))
}

export { createUpdateSchedule, createRenderSchedule }
