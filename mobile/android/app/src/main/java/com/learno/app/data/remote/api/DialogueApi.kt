package com.learno.app.data.remote.api

import com.learno.app.data.model.*
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.*

interface DialogueApi {
    @POST("dialogue/sessions/start")
    suspend fun startSession(@Body request: Map<String, Any>): Response<ApiResponse<DialogueSession>>

    @POST("dialogue/sessions/{sessionId}/end")
    suspend fun endSession(@Path("sessionId") sessionId: String): Response<ApiResponse<DialogueSession>>

    @Multipart
    @POST("dialogue/process-audio")
    suspend fun processAudio(
        @Part("sessionId") sessionId: RequestBody,
        @Part("language") language: RequestBody,
        @Part audio: MultipartBody.Part
    ): Response<ApiResponse<DialogueTurn>>

    @GET("dialogue/sessions")
    suspend fun getSessionHistory(@Query("limit") limit: Int = 10): Response<ApiResponse<List<DialogueSession>>>

    @GET("dialogue/sessions/{sessionId}/turns")
    suspend fun getSessionTurns(@Path("sessionId") sessionId: String): Response<ApiResponse<List<DialogueTurn>>>

    @GET("conversation/scenarios")
    suspend fun getScenarios(
        @Query("language") language: String,
        @Query("difficulty") difficulty: String? = null
    ): Response<ApiResponse<List<ConversationScenario>>>

    @POST("conversation/scenarios/start")
    suspend fun startScenario(@Body request: Map<String, Any>): Response<ApiResponse<DialogueSession>>
}
