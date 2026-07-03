class SpringJoint extends Joint {
	constructor(connection, springConstant, restLength) {
		super(connection);

		this.springConstant = springConstant;
		this.restLength = restLength;
	}

	updateConnectionA() {
		let anchorAPos = this.getAnchorAPos();
		let anchorBPos = this.getAnchorBPos();

		let direction = Sub(anchorBPos, anchorAPos);
		let distance = direction.Length();
		let restDistance = distance - this.restLength;
		let forceHalving = this.rigB.isKinematic ? 1 : 0.5;
		let forceMagnitude =
			restDistance * this.restLength * this.springConstant * forceHalving;
		direction.Normalize();
		let force = Scale(direction, forceMagnitude);
		this.rigA.addForceAtPoint(anchorAPos, force);

		if (restDistance <= -5) {
			this.jointConnection.color = 'blue';
		} else if (restDistance > -5) {
			this.jointConnection.color = 'red';
		} else {
			this.jointConnection.color = 'orange';
		}
	}

	updateConnectionB() {
		let anchorAPos = this.getAnchorAPos();
		let anchorBPos = this.getAnchorBPos();

		let direction = Sub(anchorAPos, anchorBPos);
		let distance = direction.Length();
		let restDistance = distance - this.restLength;
		let forceHalving = this.rigA.isKinematic ? 1 : 0.5;
		let forceMagnitude =
			restDistance * this.restLength * this.springConstant * forceHalving;
		direction.Normalize();
		let force = Scale(direction, forceMagnitude);
		this.rigB.addForceAtPoint(anchorBPos, force);

		if (restDistance <= -5) {
			this.jointConnection.color = 'blue';
		} else if (restDistance > -5) {
			this.jointConnection.color = 'red';
		} else {
			this.jointConnection.color = 'orange';
		}
	}
}
