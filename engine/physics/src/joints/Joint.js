class Joint {
	/**
	 *
	 * @param {JointConnection} jointConnection
	 */
	constructor(jointConnection) {
		this.jointConnection = jointConnection;
		this.rigA = this.jointConnection.rigidBodyA;
		this.rigB = this.jointConnection.rigidBodyB;
		this.anchorAID = this.jointConnection.anchorAID;
		this.anchorBID = this.jointConnection.anchorBID;

		if (new.target === Joint) {
			throw new TypeError(
				"Cannot construct Abstract instances directly of class 'Joint'."
			);
		}
	}

	getAnchorAPos() {
		return this.rigA.getShape().getAnchorPos(this.anchorAID);
	}

	getAnchorBPos() {
		return this.rigB.getShape().getAnchorPos(this.anchorBID);
	}

	updateConnectionA() {}
	updateConnectionB() {}

	draw() {
		this.jointConnection.draw();
	}
}
