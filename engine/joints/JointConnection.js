class JointConnection {
	constructor(rigidBodyA, anchorAID, rigidBodyB, anchorBID) {
		this.rigidBodyA = rigidBodyA;
		this.anchorAID = anchorAID;
		this.rigidBodyB = rigidBodyB;
		this.anchorBID = anchorBID;
	}

	draw() {
		let start = this.rigidBodyA.getShape().getAnchorPos(this.anchorAID);
		let end = this.rigidBodyB.getShape().getAnchorPos(this.anchorBID);
		DrawUtils.drawLine(start, end, 'orange');
	}
}
