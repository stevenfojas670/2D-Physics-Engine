import path from "node:path"

const projectRoot = path.resolve(import.meta.dirname, "..")

function collectClassNames(program) {
	const names = new Set()
	for (const node of program.body) {
		const declaration =
			node.type === "ExportNamedDeclaration" ||
			node.type === "ExportDefaultDeclaration"
				? node.declaration
				: node
		if (
			declaration &&
			declaration.type === "ClassDeclaration" &&
			declaration.id
		) {
			names.add(declaration.id.name)
		}
	}
	return names
}

function collectExportedClasses(program, classNames) {
	const exported = new Set()
	for (const node of program.body) {
		if (node.type === "ExportNamedDeclaration") {
			if (node.declaration && node.declaration.type === "ClassDeclaration") {
				exported.add(node.declaration.id.name)
			}
			if (!node.source) {
				for (const specifier of node.specifiers) {
					if (
						specifier.local.type === "Identifier" &&
						classNames.has(specifier.local.name)
					) {
						exported.add(specifier.local.name)
					}
				}
			}
		}
		if (node.type === "ExportDefaultDeclaration") {
			const declaration = node.declaration
			if (declaration.type === "ClassDeclaration" && declaration.id) {
				exported.add(declaration.id.name)
			}
			if (
				declaration.type === "Identifier" &&
				classNames.has(declaration.name)
			) {
				exported.add(declaration.name)
			}
		}
	}
	return exported
}

const filenameMatchesExport = {
	meta: {
		type: "suggestion",
		docs: {
			description:
				"Require a file that exports one class to be named after it, and type files to end in .types.ts",
		},
		schema: [],
		messages: {
			classMismatch:
				"File '{{file}}' exports the single class '{{name}}', so it must be named '{{name}}.ts'.",
			typesSuffix: "Files under src/types/ must end in '.types.ts'.",
		},
	},
	create(context) {
		const relative = path
			.relative(projectRoot, context.filename)
			.split(path.sep)
			.join("/")
		if (!relative.startsWith("src/")) {
			return {}
		}
		const basename = path.basename(relative)
		return {
			Program(program) {
				if (
					relative.startsWith("src/types/") &&
					!basename.endsWith(".types.ts")
				) {
					context.report({ node: program, messageId: "typesSuffix" })
				}
				if (!basename.endsWith(".ts")) {
					return
				}
				const exported = collectExportedClasses(
					program,
					collectClassNames(program),
				)
				if (exported.size !== 1) {
					return
				}
				const [name] = exported
				if (basename.slice(0, -".ts".length) !== name) {
					context.report({
						node: program,
						messageId: "classMismatch",
						data: { file: basename, name },
					})
				}
			},
		}
	},
}

export { filenameMatchesExport }
