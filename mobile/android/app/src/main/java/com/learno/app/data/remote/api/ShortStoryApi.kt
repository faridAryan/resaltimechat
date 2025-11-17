package com.learno.app.data.remote.api

import com.learno.app.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface ShortStoryApi {
    @GET("short-stories")
    suspend fun getStories(
        @Query("language") language: String,
        @Query("level") level: String? = null,
        @Query("genre") genre: String? = null,
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 20
    ): Response<ApiResponse<PaginatedResponse<ShortStory>>>

    @GET("short-stories/{id}")
    suspend fun getStory(@Path("id") id: String): Response<ApiResponse<ShortStory>>

    @POST("short-stories/generate")
    suspend fun generateStory(@Body request: Map<String, Any>): Response<ApiResponse<ShortStory>>

    @POST("short-stories/{storyId}/sessions/start")
    suspend fun startReadingSession(@Path("storyId") storyId: String): Response<ApiResponse<ReadingSession>>

    @POST("reading-sessions/{sessionId}/complete")
    suspend fun completeReadingSession(
        @Path("sessionId") sessionId: String,
        @Body request: Map<String, Any>
    ): Response<ApiResponse<ReadingSession>>

    @POST("short-stories/{storyId}/bookmark")
    suspend fun bookmarkStory(@Path("storyId") storyId: String): Response<ApiResponse<Boolean>>

    @DELETE("short-stories/{storyId}/bookmark")
    suspend fun removeBookmark(@Path("storyId") storyId: String): Response<ApiResponse<Boolean>>

    @GET("short-stories/bookmarks")
    suspend fun getBookmarkedStories(): Response<ApiResponse<List<ShortStory>>>
}
