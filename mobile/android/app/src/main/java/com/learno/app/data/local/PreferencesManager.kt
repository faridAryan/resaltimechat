package com.learno.app.data.local

import android.content.Context
import android.content.SharedPreferences

class PreferencesManager(context: Context) {
    private val sharedPreferences: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun saveAuthToken(token: String) {
        sharedPreferences.edit().putString(KEY_AUTH_TOKEN, token).apply()
    }

    fun getAuthToken(): String? {
        return sharedPreferences.getString(KEY_AUTH_TOKEN, null)
    }

    fun clearAuthToken() {
        sharedPreferences.edit().remove(KEY_AUTH_TOKEN).apply()
    }

    fun saveSelectedLanguage(language: String) {
        sharedPreferences.edit().putString(KEY_SELECTED_LANGUAGE, language).apply()
    }

    fun getSelectedLanguage(): String {
        return sharedPreferences.getString(KEY_SELECTED_LANGUAGE, "spanish") ?: "spanish"
    }

    fun saveUserLevel(level: String) {
        sharedPreferences.edit().putString(KEY_USER_LEVEL, level).apply()
    }

    fun getUserLevel(): String {
        return sharedPreferences.getString(KEY_USER_LEVEL, "intermediate") ?: "intermediate"
    }

    companion object {
        private const val PREFS_NAME = "learno_prefs"
        private const val KEY_AUTH_TOKEN = "auth_token"
        private const val KEY_SELECTED_LANGUAGE = "selected_language"
        private const val KEY_USER_LEVEL = "user_level"
    }
}
