/**
 * Collision group and masking system.
 *
 * This module provides a bitmask-based collision grouping system that allows
 * fine-grained control over which rigid bodies can collide with each other.
 * Up to 32 groups can be defined using bit-shift operations.
 *
 * @example
 * // Check if a body in GROUP0 can collide with GROUP1
 * const canCollide = (CollisionMatrix[CollisionGroups.GROUP0.id] & CollisionGroups.GROUP1.id) > 0;
 */

/**
 * Collision group definitions.
 *
 * Each group is assigned a unique bit flag (powers of 2) and a descriptive name.
 * These are used as bitmask values in collision detection and the collision matrix.
 */
export const CollisionGroups = {
	/** Group 0 (0000 0001 = 1). */
	GROUP0: { id: 1 << 0, name: "GROUP0" },
	/** Group 1 (0000 0010 = 2). */
	GROUP1: { id: 1 << 1, name: "GROUP1" },
	/** Group 2 (0000 0100 = 4). */
	GROUP2: { id: 1 << 2, name: "GROUP2" },
	/** Group 3 (0000 1000 = 8). */
	GROUP3: { id: 1 << 3, name: "GROUP3" },
	/** Group 4 (0001 0000 = 16). */
	GROUP4: { id: 1 << 4, name: "GROUP4" },
	/** Group 5 (0010 0000 = 32). */
	GROUP5: { id: 1 << 5, name: "GROUP5" },
	/** Group 6 (0100 0000 = 64). */
	GROUP6: { id: 1 << 6, name: "GROUP6" },
	/** Group 7 (1000 0000 = 256). */
	GROUP7: { id: 1 << 7, name: "GROUP7" },
}

/**
 * Default collision mask allowing all groups to collide with each other.
 *
 * This is a bitwise OR of all group IDs (0xFF = 255).
 * Use this as a starting point and modify the collision matrix to restrict collisions.
 */
export const DEFAULT_COLLISION =
	CollisionGroups.GROUP0.id |
	CollisionGroups.GROUP1.id |
	CollisionGroups.GROUP2.id |
	CollisionGroups.GROUP3.id |
	CollisionGroups.GROUP4.id |
	CollisionGroups.GROUP5.id |
	CollisionGroups.GROUP6.id |
	CollisionGroups.GROUP7.id

/**
 * Collision matrix defining which groups each group can collide with.
 *
 * Maps group IDs to collision masks. For each group, the corresponding mask indicates
 * which other groups it can collide with. Modify this matrix to customize collision rules.
 *
 * @example
 * // Prevent GROUP0 from colliding with GROUP1
 * CollisionMatrix[CollisionGroups.GROUP0.id] &= ~CollisionGroups.GROUP1.id;
 */
export const CollisionMatrix = {
	[CollisionGroups.GROUP0.id]: DEFAULT_COLLISION,
	[CollisionGroups.GROUP1.id]: DEFAULT_COLLISION,
	[CollisionGroups.GROUP2.id]: DEFAULT_COLLISION,
	[CollisionGroups.GROUP3.id]: DEFAULT_COLLISION,
	[CollisionGroups.GROUP4.id]: DEFAULT_COLLISION,
	[CollisionGroups.GROUP5.id]: DEFAULT_COLLISION,
	[CollisionGroups.GROUP6.id]: DEFAULT_COLLISION,
	[CollisionGroups.GROUP7.id]: DEFAULT_COLLISION,
}
