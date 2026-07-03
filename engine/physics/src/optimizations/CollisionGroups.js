/**
 * Rigidbodies will be in groups this way we can define what groups can and cannot
 * collide with each other.
 * We can have a total of 2^32 groups
 */

const CollisionGroups = {
    GROUP0: { id: 1 << 0, name: "GROUP0" }, // 0000 0001 // 1
    GROUP1: { id: 1 << 1, name: "GROUP1" }, // 0000 0010 // 2
    GROUP2: { id: 1 << 2, name: "GROUP2" }, // 0000 0100 // 4
    GROUP3: { id: 1 << 3, name: "GROUP3" }, // 0000 1000 // 8
    GROUP4: { id: 1 << 4, name: "GROUP4" }, // 0001 0000 // 16
    GROUP5: { id: 1 << 5, name: "GROUP5" }, // 0010 0000 // 32
    GROUP6: { id: 1 << 6, name: "GROUP6" }, // 0100 0000 // 64
    GROUP7: { id: 1 << 7, name: "GROUP7" } // 1000 0000 // 256
}

// 1111 1111 -> 256
DEFAULT_COLLISION = 
    CollisionGroups.GROUP0.id |
    CollisionGroups.GROUP1.id |
    CollisionGroups.GROUP2.id |
    CollisionGroups.GROUP3.id |
    CollisionGroups.GROUP4.id |
    CollisionGroups.GROUP5.id |
    CollisionGroups.GROUP6.id |
    CollisionGroups.GROUP7.id;

// Equivalent to dictionary in C#
// var collisionMatrix = new Dictionary<TypeOfGroupId : int, TypeOfDefaultCollision : int>() { CollisionGroups.GROUP0.id, DEFAULT_COLLISION };
const CollisionMatrix = {
    [CollisionGroups.GROUP0.id] : DEFAULT_COLLISION,
    [CollisionGroups.GROUP1.id] : DEFAULT_COLLISION,
    [CollisionGroups.GROUP2.id] : DEFAULT_COLLISION,
    [CollisionGroups.GROUP3.id] : DEFAULT_COLLISION,
    [CollisionGroups.GROUP4.id] : DEFAULT_COLLISION,
    [CollisionGroups.GROUP5.id] : DEFAULT_COLLISION,
    [CollisionGroups.GROUP6.id] : DEFAULT_COLLISION,
    [CollisionGroups.GROUP7.id] : DEFAULT_COLLISION
}