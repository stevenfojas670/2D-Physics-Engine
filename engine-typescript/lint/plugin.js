import { filenameMatchesExport } from "./filenameMatchesExport.js"
import { noComments } from "./noComments.js"
import { layersRule } from "./layers.js"

const plugin = {
	meta: { name: "local" },
	rules: {
		"filename-matches-export": filenameMatchesExport,
		"no-comments": noComments,
		layers: layersRule,
	},
}

export { plugin }
