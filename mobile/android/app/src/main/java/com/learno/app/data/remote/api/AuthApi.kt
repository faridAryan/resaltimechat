package com.learno.app.data.remote.api

import com.learno.app.data.model.*
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT

interface AuthApi {
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<ApiResponse<AuthResponse>>

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<ApiResponse<AuthResponse>>

    @GET("users/me")
    suspend fun getCurrentUser(): Response<ApiResponse<User>>

    @PUT("users/me/profile")
    suspend fun updateProfile(@Body profile: UserProfile): Response<ApiResponse<User>>
}
