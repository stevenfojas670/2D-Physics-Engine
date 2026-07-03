class ForceJoint extends Joint {
	constructor(connection, strength) {
		super(connection);
		this.strength = strength;
	}

	updateConnectionA() {
		let anchorAPos = this.getAnchorAPos();
		let anchorBPos = this.getAnchorBPos();

		let direction = Sub(anchorBPos, anchorAPos);
		direction.Normalize();
		this.rigA.addForceAtPoint(
			anchorBPos,
			Scale(direction, this.strength * 0.5)
		);
	}

	updateConnectionB() {
		let anchorAPos = this.getAnchorAPos();
		let anchorBPos = this.getAnchorBPos();

		let direction = Sub(anchorAPos, anchorBPos);
		direction.Normalize();
		this.rigB.addForceAtPoint(
			anchorAPos,
			Scale(direction, this.strength * 0.5)
		);
	}
}
