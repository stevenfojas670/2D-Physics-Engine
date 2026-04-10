class StaticBody {
    constructor(shape) {
        this.shape = shape;

        // Configuring Collision Masks and Groups
		this.collisionGroup = CollisionGroups.GROUP0.id;
    }  

    setCollisionGroup(group) {
		this.collisionGroup = group.id;
	}

    getShape() {
		return this.shape;
	}
}