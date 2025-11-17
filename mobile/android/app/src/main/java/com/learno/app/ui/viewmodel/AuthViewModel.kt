package com.learno.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.learno.app.LearnoApplication
import com.learno.app.data.local.PreferencesManager
import com.learno.app.data.model.LoginRequest
import com.learno.app.data.model.RegisterRequest
import com.learno.app.data.model.User
import com.learno.app.data.remote.ApiClient
import com.learno.app.data.remote.api.AuthApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class AuthViewModel : ViewModel() {
    private val authApi = ApiClient.createService(AuthApi::class.java)
    private val preferencesManager = PreferencesManager(LearnoApplication.instance)

    private val _isAuthenticated = MutableStateFlow(checkAuthStatus())
    val isAuthenticated: StateFlow<Boolean> = _isAuthenticated

    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage

    init {
        if (_isAuthenticated.value) {
            loadCurrentUser()
        }
    }

    private fun checkAuthStatus(): Boolean {
        return preferencesManager.getAuthToken() != null
    }

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            try {
                val response = authApi.login(LoginRequest(email, password))
                if (response.isSuccessful && response.body()?.success == true) {
                    response.body()?.data?.let { authResponse ->
                        ApiClient.setAuthToken(authResponse.token)
                        _currentUser.value = authResponse.user
                        _isAuthenticated.value = true
                    }
                } else {
                    _errorMessage.value = response.body()?.error ?: "Login failed"
                }
            } catch (e: Exception) {
                _errorMessage.value = e.message ?: "Network error"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun register(
        email: String,
        password: String,
        username: String,
        nativeLanguage: String,
        targetLanguages: List<String>
    ) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            try {
                val response = authApi.register(
                    RegisterRequest(email, password, username, nativeLanguage, targetLanguages)
                )
                if (response.isSuccessful && response.body()?.success == true) {
                    response.body()?.data?.let { authResponse ->
                        ApiClient.setAuthToken(authResponse.token)
                        _currentUser.value = authResponse.user
                        _isAuthenticated.value = true
                    }
                } else {
                    _errorMessage.value = response.body()?.error ?: "Registration failed"
                }
            } catch (e: Exception) {
                _errorMessage.value = e.message ?: "Network error"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun logout() {
        ApiClient.clearAuthToken()
        _isAuthenticated.value = false
        _currentUser.value = null
    }

    private fun loadCurrentUser() {
        viewModelScope.launch {
            try {
                val response = authApi.getCurrentUser()
                if (response.isSuccessful && response.body()?.success == true) {
                    _currentUser.value = response.body()?.data
                } else {
                    logout()
                }
            } catch (e: Exception) {
                logout()
            }
        }
    }
}
