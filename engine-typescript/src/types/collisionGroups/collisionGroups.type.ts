/**
 * A collision group with an ID and descriptive name.
 *
 * Collision groups use bitmask IDs (powers of 2) to enable efficient
 * bitwise operations for collision detection and filtering.
 */
export type CollisionGroup = {
	/** Bitmask ID for this collision group (power of 2). */
	id: number
	/** Human-readable name for this group. */
	name: string
}

/**
 * A collision mask representing which groups can collide with each other.
 *
 * This is a bitwise combination of group IDs. For example:
 * - `GROUP0.id | GROUP1.id` means "can collide with GROUP0 and GROUP1"
 * - `0xFF` means "can collide with all groups"
 */
export type CollisionMask = number

/**
 * The collision matrix that maps group IDs to their collision masks.
 *
 * Defines the collision rules for each group.
 */
export type CollisionMatrix = Record<number, CollisionMask>
