class Entity {
	/**
	 *
	 * @param {String} _tag - tag for the entity
	 * @param {Number} _id - id the entity will have
	 */
	constructor(_tag = 'default', _id = 0) {
		this.m_components = {
			CTransform: null,
			CShape: null,
			CLifeSpan: null,
		};

		this.m_is_alive = true;
		this.m_tag = _tag;
		this.m_id = _id;
	}

	/**
	 *
	 * @param {Component} Component
	 * Adds components to the current entity
	 */
	add(Component) {}

	get() {}

	id() {}

	isAlive() {}

	destroy() {
		this.m_is_alive = false;
	}

	tag() {}
}
