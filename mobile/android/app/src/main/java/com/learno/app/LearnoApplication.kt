package com.learno.app

import android.app.Application
import com.learno.app.data.remote.ApiClient

class LearnoApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        instance = this

        // Initialize API client
        ApiClient.initialize(this)
    }

    companion object {
        lateinit var instance: LearnoApplication
            private set
    }
}
