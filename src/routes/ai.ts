import { Elysia } from 'elysia'

export const aiRouters = new Elysia().group('/ai', (app) =>
	app.post('/url', async ({ vectorStore }) => {
		vectorStore.setCollection()
		try {
		} catch (error) {
			console.log(error)
			throw new Error('Something went wrong')
		}
	}),
)
