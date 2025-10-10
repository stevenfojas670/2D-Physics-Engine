class EntityManager {
	constructor() {
		/**
		 * Each Entity types (of different tags) will have
		 * its own list.
		 * @type {Array}
		 */
		this.m_entities = [];

		/**
		 * Stores entities to be added to the entity list
		 * which should be invoked on the next frame
		 * @type {Queue}
		 */
		this.m_toAdd = [];

		/**
		 * Map storing the entity tags as keys and references
		 * to those entities as values
		 * @type {Object.<string, Entity[]>}
		 */
		this.m_entityMap = {};

		/**
		 * Stores total entity entries in the entity list.
		 * When entities are created, just give the entity
		 * this value and then increment it.
		 */
		this.m_totalEntries = 0;
	}

	/**
	 * Called at the beginning of each frame by the engine.
	 * Entities added will now be available to use this frame
	 */
	update() {
		// Check for entities that are queued to be added
		for (entity in this.m_toAdd) {
			// Add entity to entity list
			this.m_entities.push(entity);

			// store it in the map of tag->entityVector
			this.m_entityMap[tag].push(entity);
		}
		this.m_toAdd = [];

		// Check for entities that are not alive
		// Iterate backwards so the remaining entities are unaffected in position
		// and still avoiding iterator invalidation
		for (let i = this.m_entities.length - 1; i >= 0; i--) {
			let entity = this.m_entities[i];
			if (entity.m_is_alive == false) {
				// Remove entity from entity list
				entity.splice(i, 1);

				// Remove the entity from the entity map
				for (let j = this.m_entityMap[entity.m_tag].length; j >= 0; j--) {
					if (this.m_entityMap[entity.m_tag][j].m_id === entity.m_id) {
						this.m_entityMap[entity.m_tag].splice(j, 1);
					}
				}
			}
		}
	}

	/**
	 *
	 * @param {String} tag - Entity to be added
	 * Adds an entity to the list and the tag
	 * to the map.
	 */
	addEntity(tag) {
		// Create a new Entity object
		// The entity's location in the entity list is stored in Entity.m_id
		let entity = new Entity(tag, this.m_totalEntries++);

		// store it in the vector of all entities
		this.m_toAdd.push(entity);

		// return the shared pointer pointing to that entity
		return entity;

		// Example usage: We want to return the entity so we can add to it
		// void spawnEnemy()
		// {
		//     auto e = this.m_entities.addEntity("enemy");
		//     e->add<CTransform>(args);
		//     e->add<CShape>(args);
		// }
	}

	/**
	 *
	 * @returns all entities
	 */
	getEntities() {
		return this.m_entityMap;
	}

	/**
	 *
	 * @param {String} tag - Entities to be returned
	 * @returns all entities with the tag
	 */
	getEntities(tag) {
		return this.m_entityMap[tag];
	}

	storage() {}

	bookkeeping() {}
}
