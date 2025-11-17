package com.learno.app.data.remote.api

import com.learno.app.data.model.*
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query

interface ProgressApi {
    @GET("progress/dashboard")
    suspend fun getDashboard(@Query("language") language: String): Response<ApiResponse<ProgressDashboard>>

    @GET("progress/history")
    suspend fun getProgressHistory(
        @Query("language") language: String,
        @Query("startDate") startDate: String,
        @Query("endDate") endDate: String,
        @Query("periodType") periodType: String = "daily"
    ): Response<ApiResponse<List<ProgressSnapshot>>>

    @GET("progress/insights")
    suspend fun getInsights(@Query("language") language: String): Response<ApiResponse<ProgressInsights>>

    @GET("progress/predict-goal")
    suspend fun predictGoal(
        @Query("language") language: String,
        @Query("targetLevel") targetLevel: String
    ): Response<ApiResponse<GoalPrediction>>

    @GET("progress/streak")
    suspend fun getStreak(): Response<ApiResponse<StreakData>>
}
