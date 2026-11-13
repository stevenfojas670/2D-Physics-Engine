import { filenameMatchesExport } from "./filenameMatchesExport.js"
import { noComments } from "./noComments.js"

const plugin = {
	meta: { name: "local" },
	rules: {
		"filename-matches-export": filenameMatchesExport,
		"no-comments": noComments,
	},
}

export { plugin }
