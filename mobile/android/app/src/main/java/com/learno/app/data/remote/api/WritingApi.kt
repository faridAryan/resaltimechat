package com.learno.app.data.remote.api

import com.learno.app.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface WritingApi {
    @POST("writing/submissions")
    suspend fun submitWriting(@Body request: Map<String, Any>): Response<ApiResponse<WritingSubmission>>

    @GET("writing/submissions")
    suspend fun getSubmissions(
        @Query("language") language: String,
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 20
    ): Response<ApiResponse<PaginatedResponse<WritingSubmission>>>

    @GET("writing/submissions/{id}")
    suspend fun getSubmission(@Path("id") id: String): Response<ApiResponse<WritingSubmission>>

    @GET("writing/prompts")
    suspend fun getPrompts(
        @Query("language") language: String,
        @Query("writingType") writingType: String? = null,
        @Query("difficulty") difficulty: String? = null
    ): Response<ApiResponse<List<WritingPrompt>>>

    @POST("writing/prompts/generate")
    suspend fun generatePrompt(@Body request: Map<String, Any>): Response<ApiResponse<WritingPrompt>>
}
