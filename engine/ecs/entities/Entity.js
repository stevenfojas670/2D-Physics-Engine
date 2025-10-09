class Entity {
	constructor() {
		this._m_components = {
			CTransform: null,
			CShape: null,
			CLifeSpan: null,
		};

		this._m_is_alive = true;
		this._m_tag = 'default';
		this._m_id = 0;
	}

	add() {}

	get() {}

	id() {}

	isAlive() {}

	destroy() {}

	tag() {}
}
