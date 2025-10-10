/**
 * @class Component
 * @classdesc Represents a generic, abstract class that all components
 * will inherit from.
 */
class Component {
	constructor() {
		/**
		 * Whether an entity actually contains the derived component
		 * Defaults to false so default constructed components are not
		 * considered part of the Entity
		 */
		this.exists = false;
	}
}
