const noComments = {
	meta: {
		type: "suggestion",
		schema: [],
		messages: {
			comment: "Comments are not allowed; make the code self-explanatory.",
		},
	},
	create(context) {
		return {
			Program() {
				for (const comment of context.sourceCode.getAllComments()) {
					context.report({ loc: comment.loc, messageId: "comment" })
				}
			},
		}
	},
}

export { noComments }
