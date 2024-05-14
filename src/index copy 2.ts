import { Elysia, t } from 'elysia'
import { logger } from 'logixlysia'

import { vectorStoreSetup } from './plugins'
import { Document } from '@langchain/core/documents'
import { convert } from 'html-to-text'
import { CharacterTextSplitter } from 'langchain/text_splitter'
import { CheerioWebBaseLoader } from 'langchain/document_loaders/web/cheerio'
import { MozillaReadabilityTransformer } from '@langchain/community/document_transformers/mozilla_readability'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { WebPDFLoader } from 'langchain/document_loaders/web/pdf'

const app = new Elysia()
	.use(vectorStoreSetup())
	// .use(traceloopObservability)
	.use(logger())
	.get('/', () => 'Hello Elysia')
	.post('/ai/parse', async ({ vectorStore }) => {
		const unparsedUrls: string[] = []
		// const res = await fetch(
		// 	'https://z9p.b10.myftpupload.com/wp-json/wp/v2/media?page=17&per_page=10&search=pdf',
		// )
		const resJson = [
			'https://z9p.b10.myftpupload.com/wp-content/uploads/2024/02/report-2.pdf',
			'https://z9p.b10.myftpupload.com/wp-content/uploads/2024/02/report-1.pdf',
		]

		const docs = resJson.map(async (post: any) => {
			const res = await fetch(post)
			const file = await res.blob()
			const loader = new WebPDFLoader(file)
			console.log('here')
			const documents = await loader.load()

			if (documents.length === 0) {
				console.log(post)
				unparsedUrls.push(post)
				return []
			}

			const splitter = new CharacterTextSplitter()

			const output = await splitter.transformDocuments(documents)
			return output.map((doc) => {
				const { metadata } = doc

				return {
					...doc,
					metadata: {
						...metadata,
						link: post,
						type: 'pdf',
					},
				}
			})
		})

		const documentsArr = await Promise.all(docs)
		const documents = documentsArr.flat()
		console.log(documents)

		await vectorStore.addDocuments(documents)

		return {
			message: 'Documents added',
			unparsedUrls,
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
