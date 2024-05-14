import { Elysia } from 'elysia'
// import {
// 	PGVectorStore,
// 	VectorStoreIndex,
// 	storageContextFromDefaults,
// } from 'llamaindex'

import { PGVectorStore } from 'langchain/vectorstores/pgvector'
import { OpenAIEmbeddings } from '@langchain/openai'
import type { PoolConfig } from 'pg'

export const PGVECTOR_COLLECTION = 'data'
export const PGVECTOR_SCHEMA = 'public'
export const PGVECTOR_TABLE = 'app_embedding'

const dbConfig = {
	tableName: 'testlangchain',
	postgresConnectionOptions: {
		connectionString: Bun.env.DATABASE_URL,
	} as PoolConfig,
}

export const vectorStoreSetup = async () => {
	// Set up the DB.
	// Can skip this step if you've already initialized the DB.
	// await PGVectorStore.initialize(new OpenAIEmbeddings(), dbConfig)

	const vectorStore = new PGVectorStore(new OpenAIEmbeddings(), dbConfig)

	return new Elysia({
		name: '@ktb/vector-store',
	}).decorate('vectorStore', vectorStore)
}
