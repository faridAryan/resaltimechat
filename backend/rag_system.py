import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
import os
from typing import List, Dict, Optional
import uuid
from langchain.text_splitter import RecursiveCharacterTextSplitter


class RAGSystem:
    """RAG system for contextual language learning"""

    def __init__(self, persist_directory: str = "./chroma_db"):
        """Initialize the RAG system with ChromaDB"""
        self.persist_directory = persist_directory

        # Initialize ChromaDB
        self.client = chromadb.Client(Settings(
            persist_directory=persist_directory,
            anonymized_telemetry=False
        ))

        # Create or get collection
        self.collection = self.client.get_or_create_collection(
            name="language_practice_docs",
            metadata={"hnsw:space": "cosine"}
        )

        # Initialize embedding model
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

        # Text splitter for chunking documents
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50,
            length_function=len,
        )

    async def add_document(self, text: str, metadata: Optional[Dict] = None) -> str:
        """Add a document to the RAG system"""
        # Split text into chunks
        chunks = self.text_splitter.split_text(text)

        doc_id = str(uuid.uuid4())

        for i, chunk in enumerate(chunks):
            # Generate embedding
            embedding = self.embedding_model.encode(chunk).tolist()

            # Prepare metadata
            chunk_metadata = metadata or {}
            chunk_metadata.update({
                "doc_id": doc_id,
                "chunk_index": i,
                "total_chunks": len(chunks)
            })

            # Add to collection
            self.collection.add(
                embeddings=[embedding],
                documents=[chunk],
                metadatas=[chunk_metadata],
                ids=[f"{doc_id}_chunk_{i}"]
            )

        return doc_id

    async def query(self, query_text: str, n_results: int = 3) -> List[Dict]:
        """Query the RAG system for relevant context"""
        # Generate query embedding
        query_embedding = self.embedding_model.encode(query_text).tolist()

        # Query the collection
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results
        )

        # Format results
        context_docs = []
        if results['documents'] and len(results['documents']) > 0:
            for i, doc in enumerate(results['documents'][0]):
                context_docs.append({
                    "text": doc,
                    "metadata": results['metadatas'][0][i] if results['metadatas'] else {},
                    "distance": results['distances'][0][i] if results['distances'] else None
                })

        return context_docs

    async def clear_documents(self):
        """Clear all documents from the RAG system"""
        self.client.delete_collection("language_practice_docs")
        self.collection = self.client.get_or_create_collection(
            name="language_practice_docs",
            metadata={"hnsw:space": "cosine"}
        )

    def get_document_count(self) -> int:
        """Get the number of documents in the system"""
        return self.collection.count()
