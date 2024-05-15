import { Elysia, t } from 'elysia'
import { logger } from 'logixlysia'
import { cors } from '@elysiajs/cors'

import { vectorStoreSetup } from './plugins'
import { Document } from '@langchain/core/documents'
import { convert } from 'html-to-text'
import { CharacterTextSplitter } from 'langchain/text_splitter'
import { CheerioWebBaseLoader } from 'langchain/document_loaders/web/cheerio'
import { MozillaReadabilityTransformer } from '@langchain/community/document_transformers/mozilla_readability'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { WebPDFLoader } from 'langchain/document_loaders/web/pdf'
import { Message as VercelChatMessage, StreamingTextResponse } from 'ai'

import { ChatOpenAI } from '@langchain/openai'
import { PromptTemplate } from '@langchain/core/prompts'
import { HttpResponseOutputParser } from 'langchain/output_parsers'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { ConversationSummaryMemory } from 'langchain/memory'

import { formatDocumentsAsString } from 'langchain/util/document'
import { RunnableSequence } from '@langchain/core/runnables'
import {
	BytesOutputParser,
	StringOutputParser,
} from '@langchain/core/output_parsers'

const combineDocumentsFn = (docs: Document[]) => {
	const serializedDocs = docs.map((doc) => doc.pageContent)
	return serializedDocs.join('\n\n')
}

const formatVercelMessages = (chatHistory: VercelChatMessage[]) => {
	const formattedDialogueTurns = chatHistory.map((message) => {
		if (message.role === 'user') {
			return `Human: ${message.content}`
		}
		if (message.role === 'assistant') {
			return `Assistant: ${message.content}`
		}
		return `${message.role}: ${message.content}`
	})
	return formattedDialogueTurns.join('\n')
}

const model = new ChatOpenAI({
	temperature: 0.9,
	model: 'gpt-4o',
})

const formatChatHistory = (
	human: string,
	ai: string,
	previousChatHistory?: string,
) => {
	const newInteraction = `Human: ${human}\nAI: ${ai}`
	if (!previousChatHistory) {
		return newInteraction
	}
	return `${previousChatHistory}\n\n${newInteraction}`
}

// const questionPrompt = PromptTemplate.fromTemplate(
// 	`Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.
//   ----------------
//   CONTEXT: {context}
//   ----------------
//   CHAT HISTORY: {chatHistory}
//   ----------------
//   QUESTION: {question}
//   ----------------
//   Helpful Answer:`,
// )

const CONDENSE_QUESTION_TEMPLATE = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.

	<chat_history>
		{chat_history}
	</chat_history>

	Follow Up Input: {question}
	Standalone question:`
const condenseQuestionPrompt = PromptTemplate.fromTemplate(
	CONDENSE_QUESTION_TEMPLATE,
)

const ANSWER_TEMPLATE = `You are an serious respectful AI Asseistant, and must answer all questions in the user language.

	Answer the question based only on the following context and chat history:
	<context>
		{context}
	</context>

	<chat_history>
		{chat_history}
	</chat_history>

	Question: {question}
	`
const answerPrompt = PromptTemplate.fromTemplate(ANSWER_TEMPLATE)

const app = new Elysia()
	.use(vectorStoreSetup())
	.use(cors({ origin: '*' }))
	// .use(traceloopObservability)
	.use(logger())
	.get('/', () => 'Hello Elysia')
	.post('/ai/parse', async ({ vectorStore }) => {})
	.post('/ai/chat', async ({ vectorStore, body }) => {
		const messages = body.messages ?? []
		const previousMessages = messages.slice(0, -1)
		const currentMessageContent = messages[messages.length - 1].content

		const standaloneQuestionChain = RunnableSequence.from([
			condenseQuestionPrompt,
			model,
			new StringOutputParser(),
		])

		let resolveWithDocuments: (value: Document[]) => void
		const documentPromise = new Promise<Document[]>((resolve) => {
			resolveWithDocuments = resolve
		})

		const retriever = vectorStore.asRetriever({
			callbacks: [
				{
					handleRetrieverEnd(documents) {
						resolveWithDocuments(documents)
					},
				},
			],
		})

		const retrievalChain = retriever.pipe(combineDocumentsFn)

		const answerChain = RunnableSequence.from([
			{
				context: RunnableSequence.from([
					(input) => input.question,
					retrievalChain,
				]),
				chat_history: (input) => input.chat_history,
				question: (input) => input.question,
			},
			answerPrompt,
			model,
		])

		const conversationalRetrievalQAChain = RunnableSequence.from([
			{
				question: standaloneQuestionChain,
				chat_history: (input) => input.chat_history,
			},
			answerChain,
			new BytesOutputParser(),
		])

		const stream = await conversationalRetrievalQAChain.invoke({
			question: currentMessageContent,
			chat_history: formatVercelMessages(previousMessages),
		})

		const documents = await documentPromise
		const serializedSources = Buffer.from(
			JSON.stringify(
				documents.map((doc) => {
					return {
						pageContent: doc.pageContent.slice(0, 50) + '...',
						metadata: doc.metadata,
					}
				}),
			),
		)
		console.log(stream)
		return stream
	})
	.listen(3000)
