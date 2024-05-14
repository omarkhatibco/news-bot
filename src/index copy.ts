import { Elysia, t } from 'elysia'
import { logger } from 'logixlysia'

import { vectorStoreSetup } from './plugins'
import { Document } from '@langchain/core/documents'
import { convert } from 'html-to-text'
import { CharacterTextSplitter } from 'langchain/text_splitter'
import { CheerioWebBaseLoader } from 'langchain/document_loaders/web/cheerio'
import { MozillaReadabilityTransformer } from '@langchain/community/document_transformers/mozilla_readability'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'

const app = new Elysia()
	.use(vectorStoreSetup())
	// .use(traceloopObservability)
	.use(logger())
	.get('/', () => 'Hello Elysia')
	.post('/ai/parse', async ({ vectorStore }) => {
		const backendUrl =
			'https://z9pb10.n3cdn1.secureserver.net/wp-content/uploads/2024/03/initiatives-13.pdf?time=1715120104'

		// const loader = new CheerioWebBaseLoader(
		// 	'https://z9p.b10.myftpupload.com/council-partners/',
		// )

		// const docs = await loader.load()

		// const splitter = RecursiveCharacterTextSplitter.fromLanguage('html')
		// const transformer = new MozillaReadabilityTransformer()

		// const sequence = splitter.pipe(transformer)

		// const newDocuments = await sequence.invoke(docs)

		const res = await fetch(backendUrl)
		const data = await res.json()
		const documents = data.map((post: any) => {
			const title = convert(post.title.rendered)
			const content = convert(post.content.rendered)
			const { link, modified: date, id, type } = post
			const document = new Document({
				pageContent: `${title}
				\n\n
				${content}
				`,
				metadata: {
					id,
					date,
					link,
					type,
				},
			})

			return document
		})

		// const documents = data.map((item: any) => {
		// 	const doc = new Document({
		// 		pageContent: `${item.title}
		// 		\n\n
		// 		${item.content}
		// 		`,
		// 		metadata: {
		// 			id: item.id,
		// 			date: item.modified,
		// 			link: item.link,
		// 			type: item.type,
		// 		},
		// 	})
		// 	return doc
		// })

		console.log(documents)

		// const splitter = new CharacterTextSplitter()

		// const output = await splitter.transformDocuments(documents)
		// console.log(output)
		await vectorStore.addDocuments(documents)

		return {
			message: 'Documents added',
		}
	})
	.post(
		'/ai/chat',
		async ({ storageContext, body }) => {
			// const { question } = body
			// console.log(storageContext.vectorStore)
			// const index = await VectorStoreIndex.fromVectorStore(
			// 	storageContext.vectorStore,
			// )
			// const queryEngine = index.asQueryEngine()
			// const similarityResults = await queryEngine.query({
			// 	query: question,
			// })
			// const tools = [
			// 	new QueryEngineTool({
			// 		queryEngine,
			// 		metadata: {
			// 			name: 'data_query_engine',
			// 			description: 'A query engine for documents in Datapase',
			// 		},
			// 	}),
			// ]
			// const retriever = index.asRetriever()
			// const chatEngine = new SimpleChatEngine({
			// 	llm: llama3,
			// })
			// const chatHistory: ChatMessage[] = [
			// 	{
			// 		role: 'system',
			// 		content:
			// 			'You are a helpful assistant. for a news website you will recieve a question form the user and you will respond with a news articles that are provided via context.',
			// 	},
			// 	{
			// 		role: 'user',
			// 		content: `Answer the following question using the provided context. If you cannot answer the question with the context, don't lie and make up stuff. Just say you need more context.
			// 		Remeber to answer in the question language.
			//   Question: ${question}
			//   Context: ${similarityResults.sourceNodes
			// 		?.map((r) => r.node.getContent('ALL'))
			// 		.join('\n')}`,
			// 	},
			// ]
			// const response = await chatEngine.chat({
			// 	message: question,
			// 	chatHistory,
			// })
			// const result = response.response
			// return {
			// 	result,
			// 	similarityResults: similarityResults.sourceNodes,
			// }
		},
		{
			body: t.Object({
				question: t.String(),
			}),
		},
	)
	.listen(3000)
