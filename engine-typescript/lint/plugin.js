import { filenameMatchesExport } from "./filenameMatchesExport.js"

const plugin = {
	meta: { name: "local" },
	rules: {
		"filename-matches-export": filenameMatchesExport,
	},
}

export { plugin }
