package com.learno.app.data.remote

import android.content.Context
import com.learno.app.BuildConfig
import com.learno.app.data.local.PreferencesManager
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    private lateinit var retrofit: Retrofit
    private lateinit var preferencesManager: PreferencesManager

    fun initialize(context: Context) {
        preferencesManager = PreferencesManager(context)

        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }

        val authInterceptor = Interceptor { chain ->
            val original = chain.request()
            val requestBuilder = original.newBuilder()
                .header("Content-Type", "application/json")

            // Add auth token if available
            preferencesManager.getAuthToken()?.let { token ->
                requestBuilder.header("Authorization", "Bearer $token")
            }

            val request = requestBuilder.build()
            chain.proceed(request)
        }

        val client = OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(loggingInterceptor)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()

        retrofit = Retrofit.Builder()
            .baseUrl("${BuildConfig.API_BASE_URL}/v1/")
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    fun <T> createService(serviceClass: Class<T>): T {
        return retrofit.create(serviceClass)
    }

    fun setAuthToken(token: String) {
        preferencesManager.saveAuthToken(token)
    }

    fun clearAuthToken() {
        preferencesManager.clearAuthToken()
    }
}
