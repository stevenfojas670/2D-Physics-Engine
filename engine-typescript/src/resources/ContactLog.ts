import { defineResource } from "@/ecs/defineResource"

const CONTACT_STRIDE = 5
const FRICTION_STRIDE = 4

class ContactLog {
	readonly contacts: number[]
	readonly frictionArrows: number[]
	private contactTotal: number
	private frictionTotal: number

	constructor() {
		this.contacts = []
		this.frictionArrows = []
		this.contactTotal = 0
		this.frictionTotal = 0
	}

	get contactCount(): number {
		return this.contactTotal
	}

	get frictionCount(): number {
		return this.frictionTotal
	}

	clear(): void {
		this.contactTotal = 0
		this.frictionTotal = 0
	}

	recordContact(
		pointX: number,
		pointY: number,
		normalX: number,
		normalY: number,
		depth: number,
	): void {
		const offset = this.contactTotal * CONTACT_STRIDE
		this.contacts[offset] = pointX
		this.contacts[offset + 1] = pointY
		this.contacts[offset + 2] = normalX
		this.contacts[offset + 3] = normalY
		this.contacts[offset + 4] = depth
		this.contactTotal++
	}

	recordFriction(fromX: number, fromY: number, toX: number, toY: number): void {
		const offset = this.frictionTotal * FRICTION_STRIDE
		this.frictionArrows[offset] = fromX
		this.frictionArrows[offset + 1] = fromY
		this.frictionArrows[offset + 2] = toX
		this.frictionArrows[offset + 3] = toY
		this.frictionTotal++
	}
}

const ContactsResource = defineResource<ContactLog>("Contacts")

export { CONTACT_STRIDE, FRICTION_STRIDE, ContactLog, ContactsResource }
