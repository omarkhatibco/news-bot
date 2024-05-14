import { Elysia, type Context } from 'elysia'
import traceloop from '@traceloop/node-server-sdk'
import LlamaIndex from 'llamaindex'

export const traceloopObservability = () => {
	// traceloop.initialize({
	// 	appName: 'chat-bot-app',
	// 	disableBatch: true,
	// 	instrumentModules: {
	// 		llamaIndex: LlamaIndex,
	// 	},
	// })
	console.log('here is a plugin')

	return new Elysia({
		name: '@ktb/traceloop-observability',
	})
}
