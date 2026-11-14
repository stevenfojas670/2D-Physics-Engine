type NumericFieldType = "f64" | "f32" | "i32" | "u32" | "u8"

interface RefField<T> {
	readonly kind: "ref"
	readonly valueType?: T
}

type FieldType = NumericFieldType | RefField<unknown>

type Schema = Record<string, FieldType>

interface ComponentDefinition<S extends Schema> {
	readonly id: number
	readonly name: string
	readonly schema: S
}

type TypedArrayFor<F> = F extends "f64"
	? Float64Array
	: F extends "f32"
		? Float32Array
		: F extends "i32"
			? Int32Array
			: F extends "u32"
				? Uint32Array
				: Uint8Array

type Columns<S extends Schema> = {
	[K in keyof S]: S[K] extends RefField<infer T>
		? (T | undefined)[]
		: TypedArrayFor<S[K]>
}

type FieldValues<S extends Schema> = {
	[K in keyof S]: S[K] extends RefField<infer T> ? T : number
}

let nextComponentId = 0

function ref<T>(): RefField<T> {
	return { kind: "ref" }
}

function isRefField(field: FieldType): field is RefField<unknown> {
	return typeof field === "object"
}

function defineComponent<S extends Schema>(
	name: string,
	schema: S,
): ComponentDefinition<S> {
	const id = nextComponentId
	nextComponentId++
	return { id, name, schema }
}

export type {
	NumericFieldType,
	RefField,
	FieldType,
	Schema,
	ComponentDefinition,
	Columns,
	FieldValues,
}
export { defineComponent, ref, isRefField }
