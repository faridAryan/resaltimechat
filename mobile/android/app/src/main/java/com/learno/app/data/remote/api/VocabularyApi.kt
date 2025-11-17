package com.learno.app.data.remote.api

import com.learno.app.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface VocabularyApi {
    @GET("vocabulary/decks")
    suspend fun getMyDecks(@Query("language") language: String): Response<ApiResponse<List<VocabularyDeck>>>

    @POST("vocabulary/decks")
    suspend fun createDeck(@Body request: Map<String, Any>): Response<ApiResponse<VocabularyDeck>>

    @POST("vocabulary/decks/generate")
    suspend fun generateDeck(@Body request: Map<String, Any>): Response<ApiResponse<VocabularyDeck>>

    @GET("vocabulary/decks/{deckId}/cards")
    suspend fun getCards(@Path("deckId") deckId: String): Response<ApiResponse<List<VocabularyCard>>>

    @POST("vocabulary/decks/{deckId}/cards")
    suspend fun addCard(
        @Path("deckId") deckId: String,
        @Body request: Map<String, Any>
    ): Response<ApiResponse<VocabularyCard>>

    @GET("vocabulary/reviews/due")
    suspend fun getDueCards(@Query("language") language: String): Response<ApiResponse<List<VocabularyCard>>>

    @POST("vocabulary/cards/{cardId}/review")
    suspend fun recordReview(
        @Path("cardId") cardId: String,
        @Body request: Map<String, Int>
    ): Response<ApiResponse<VocabularyReview>>

    @GET("vocabulary/reviews/statistics")
    suspend fun getReviewStatistics(@Query("language") language: String): Response<ApiResponse<Map<String, Any>>>

    @GET("vocabulary/decks/public")
    suspend fun getPublicDecks(@Query("language") language: String): Response<ApiResponse<List<VocabularyDeck>>>

    @POST("vocabulary/decks/{deckId}/subscribe")
    suspend fun subscribeToDeck(@Path("deckId") deckId: String): Response<ApiResponse<Boolean>>
}
