import { ComponentStore } from "./ComponentStore"
import type {
	ComponentDefinition,
	FieldValues,
	Schema,
} from "./defineComponent"
import type { ResourceKey } from "./defineResource"
import type { Entity } from "./Entity"
import { EntityRegistry } from "./EntityRegistry"
import { View } from "./View"
import type { StoresOf } from "./View"

type DeferredCommand = (world: World) => void

type SchemasOf<C extends readonly ComponentDefinition<Schema>[]> = {
	[K in keyof C]: C[K] extends ComponentDefinition<infer S> ? S : never
}

interface ViewOptions {
	readonly without?: readonly ComponentDefinition<Schema>[]
}

class World {
	private readonly registry: EntityRegistry
	private readonly stores: Map<number, ComponentStore<Schema>>
	private readonly resources: Map<number, unknown>
	private deferred: DeferredCommand[]

	constructor() {
		this.registry = new EntityRegistry()
		this.stores = new Map()
		this.resources = new Map()
		this.deferred = []
	}

	get entityCapacity(): number {
		return this.registry.capacity
	}

	createEntity(): Entity {
		return this.registry.create()
	}

	destroyEntity(entity: Entity): void {
		if (!this.registry.isAlive(entity)) {
			return
		}
		for (const store of this.stores.values()) {
			store.remove(entity)
		}
		this.registry.destroy(entity)
	}

	isAlive(entity: Entity): boolean {
		return this.registry.isAlive(entity)
	}

	add<S extends Schema>(
		entity: Entity,
		component: ComponentDefinition<S>,
		values?: Partial<FieldValues<S>>,
	): number {
		if (!this.registry.isAlive(entity)) {
			throw new Error(
				`Cannot add ${component.name} to entity ${entity}: it is not alive`,
			)
		}
		return this.store(component).add(entity, values)
	}

	remove(entity: Entity, component: ComponentDefinition<Schema>): boolean {
		return this.store(component).remove(entity)
	}

	has(entity: Entity, component: ComponentDefinition<Schema>): boolean {
		return this.store(component).has(entity)
	}

	store<S extends Schema>(
		component: ComponentDefinition<S>,
	): ComponentStore<S> {
		const existing = this.stores.get(component.id)
		if (existing !== undefined) {
			return existing as unknown as ComponentStore<S>
		}
		const created = new ComponentStore(component)
		this.stores.set(component.id, created as unknown as ComponentStore<Schema>)
		return created
	}

	view<const C extends readonly ComponentDefinition<Schema>[]>(
		components: C,
		options: ViewOptions = {},
	): View<SchemasOf<C>> {
		const included = components.map((component) => this.store(component))
		const excluded = (options.without ?? []).map((component) =>
			this.store(component),
		)
		return new View<SchemasOf<C>>(
			included as unknown as StoresOf<SchemasOf<C>>,
			excluded,
		)
	}

	resource<T>(key: ResourceKey<T>): T {
		if (!this.resources.has(key.id)) {
			throw new Error(`Missing resource ${key.name}`)
		}
		return this.resources.get(key.id) as T
	}

	setResource<T>(key: ResourceKey<T>, value: T): void {
		this.resources.set(key.id, value)
	}

	hasResource(key: ResourceKey<unknown>): boolean {
		return this.resources.has(key.id)
	}

	defer(command: DeferredCommand): void {
		this.deferred.push(command)
	}

	flushDeferred(): void {
		while (this.deferred.length > 0) {
			const commands = this.deferred
			this.deferred = []
			for (const command of commands) {
				command(this)
			}
		}
	}
}

export type { DeferredCommand, SchemasOf, ViewOptions }
export { World }
