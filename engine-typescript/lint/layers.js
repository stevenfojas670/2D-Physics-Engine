import path from "node:path"
import { layers, allowedImports, exceptions } from "./layerMap.js"

const sourceRoot = path.resolve(import.meta.dirname, "..", "src")

function toSourcePath(absolutePath) {
	return path.relative(sourceRoot, absolutePath).split(path.sep).join("/")
}

function matchesPattern(sourcePath, pattern) {
	if (pattern.endsWith("/**")) {
		return sourcePath.startsWith(pattern.slice(0, -2))
	}
	return sourcePath === pattern
}

function layerOf(sourcePath) {
	const layer = layers.find((candidate) =>
		candidate.files.some((pattern) => matchesPattern(sourcePath, pattern)),
	)
	return layer?.name
}

function resolveImport(specifier, importerDirectory) {
	const withoutExtension = specifier.startsWith("@/")
		? path.join(sourceRoot, specifier.slice(2))
		: specifier.startsWith(".")
			? path.join(importerDirectory, specifier)
			: undefined
	if (!withoutExtension) {
		return undefined
	}
	const sourcePath = toSourcePath(withoutExtension)
	const extension = path.extname(sourcePath)
	if (extension === "") {
		return `${sourcePath}.ts`
	}
	return extension === ".ts" ? sourcePath : undefined
}

function isException(from, to) {
	return exceptions.some(
		(exception) => exception.from === from && exception.to === to,
	)
}

const layersRule = {
	meta: {
		type: "problem",
		schema: [],
		messages: {
			unassigned: "'{{file}}' is unassigned to a layer in lint/layerMap.js.",
			forbidden:
				"The {{fromLayer}} layer may not import the {{toLayer}} layer ('{{to}}').",
		},
	},
	create(context) {
		const importer = toSourcePath(context.filename)
		if (importer.startsWith("..")) {
			return {}
		}
		const importerLayer = layerOf(importer)
		return {
			Program(node) {
				if (!importerLayer) {
					context.report({
						node,
						messageId: "unassigned",
						data: { file: importer },
					})
				}
			},
			ImportDeclaration(node) {
				if (!importerLayer) {
					return
				}
				const target = resolveImport(
					node.source.value,
					path.dirname(context.filename),
				)
				if (!target) {
					return
				}
				const targetLayer = layerOf(target)
				if (!targetLayer) {
					context.report({
						node,
						messageId: "unassigned",
						data: { file: target },
					})
					return
				}
				const allowed = allowedImports[importerLayer].includes(targetLayer)
				if (!allowed && !isException(importer, target)) {
					context.report({
						node,
						messageId: "forbidden",
						data: {
							fromLayer: importerLayer,
							toLayer: targetLayer,
							to: target,
						},
					})
				}
			},
		}
	},
}

export { layersRule }
