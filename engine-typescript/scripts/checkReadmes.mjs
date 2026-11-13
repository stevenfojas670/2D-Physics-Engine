import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

const projectRoot = path.resolve(import.meta.dirname, "..")
const readmeName = "README.md"
const fileTableHeaderPattern = /^\|\s*File\s*\|/
const tableRowPattern = /^\|/
const tableEntryPattern = /^\|\s*`([^`]+)`/
const folderLinkPattern = /\]\(([^).][^)/]*)\/README\.md\)/g

function listProjectFiles() {
	const output = execFileSync(
		"git",
		["ls-files", "--cached", "--others", "--exclude-standard"],
		{ cwd: projectRoot, encoding: "utf8" },
	)
	return output
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line !== "")
		.filter((file) => existsSync(path.join(projectRoot, file)))
}

function expectedEntriesByFolder(files) {
	const entries = new Map([[".", new Set()]])
	for (const file of files) {
		const parts = file.split("/")
		for (let depth = 0; depth < parts.length; depth++) {
			const folder = depth === 0 ? "." : parts.slice(0, depth).join("/")
			if (!entries.has(folder)) {
				entries.set(folder, new Set())
			}
			const isFolder = depth < parts.length - 1
			const name = isFolder ? `${parts[depth]}/` : parts[depth]
			if (name !== readmeName) {
				entries.get(folder).add(name)
			}
		}
	}
	return entries
}

function listedEntries(readmeText) {
	const listed = new Set()
	let insideFileTable = false
	for (const line of readmeText.split(/\r?\n/)) {
		if (fileTableHeaderPattern.test(line)) {
			insideFileTable = true
			continue
		}
		if (!tableRowPattern.test(line)) {
			insideFileTable = false
			continue
		}
		const entry = insideFileTable ? tableEntryPattern.exec(line) : null
		if (entry) {
			listed.add(entry[1])
		}
	}
	for (const match of readmeText.matchAll(folderLinkPattern)) {
		listed.add(`${match[1]}/`)
	}
	return listed
}

function findProblems() {
	const problems = []
	for (const [folder, expected] of expectedEntriesByFolder(
		listProjectFiles(),
	)) {
		const readmePath = path.join(projectRoot, folder, readmeName)
		if (!existsSync(readmePath)) {
			problems.push(`${folder}: missing ${readmeName}`)
			continue
		}
		const listed = listedEntries(readFileSync(readmePath, "utf8"))
		for (const name of expected) {
			if (!listed.has(name)) {
				problems.push(`${folder}: missing entry ${name}`)
			}
		}
		for (const name of listed) {
			if (!expected.has(name)) {
				problems.push(`${folder}: lists ${name}, which does not exist`)
			}
		}
	}
	return problems
}

const problems = findProblems()
for (const problem of problems) {
	console.error(problem)
}
process.exitCode = problems.length > 0 ? 1 : 0
