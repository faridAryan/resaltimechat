package com.learno.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.learno.app.LearnoApplication
import com.learno.app.data.local.PreferencesManager
import com.learno.app.data.model.*
import com.learno.app.data.remote.ApiClient
import com.learno.app.data.remote.api.DialogueApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File

class DialogueViewModel : ViewModel() {
    private val dialogueApi = ApiClient.createService(DialogueApi::class.java)
    private val preferencesManager = PreferencesManager(LearnoApplication.instance)

    private val _currentSession = MutableStateFlow<DialogueSession?>(null)
    val currentSession: StateFlow<DialogueSession?> = _currentSession

    private val _messages = MutableStateFlow<List<DialogueTurn>>(emptyList())
    val messages: StateFlow<List<DialogueTurn>> = _messages

    private val _scenarios = MutableStateFlow<List<ConversationScenario>>(emptyList())
    val scenarios: StateFlow<List<ConversationScenario>> = _scenarios

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _isProcessingAudio = MutableStateFlow(false)
    val isProcessingAudio: StateFlow<Boolean> = _isProcessingAudio

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage

    fun startSession(
        language: String,
        practiceMode: String,
        topic: String? = null,
        difficulty: String = "intermediate"
    ) {
        viewModelScope.launch {
            _isLoading.value = true

            try {
                val request = mutableMapOf<String, Any>(
                    "language" to language,
                    "practiceMode" to practiceMode,
                    "difficulty" to difficulty
                )
                topic?.let { request["topic"] = it }

                val response = dialogueApi.startSession(request)
                if (response.isSuccessful && response.body()?.success == true) {
                    _currentSession.value = response.body()?.data
                    _messages.value = emptyList()
                } else {
                    _errorMessage.value = response.body()?.error ?: "Failed to start session"
                }
            } catch (e: Exception) {
                _errorMessage.value = e.message ?: "Network error"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun endSession() {
        viewModelScope.launch {
            val sessionId = _currentSession.value?.id ?: return@launch

            try {
                val response = dialogueApi.endSession(sessionId)
                if (response.isSuccessful && response.body()?.success == true) {
                    _currentSession.value = response.body()?.data
                }
            } catch (e: Exception) {
                _errorMessage.value = e.message ?: "Network error"
            }
        }
    }

    fun processAudio(audioFile: File, language: String) {
        viewModelScope.launch {
            val sessionId = _currentSession.value?.id ?: return@launch
            _isProcessingAudio.value = true

            try {
                val sessionIdBody = sessionId.toRequestBody("text/plain".toMediaTypeOrNull())
                val languageBody = language.toRequestBody("text/plain".toMediaTypeOrNull())
                val audioPart = MultipartBody.Part.createFormData(
                    "audio",
                    audioFile.name,
                    audioFile.asRequestBody("audio/*".toMediaTypeOrNull())
                )

                val response = dialogueApi.processAudio(sessionIdBody, languageBody, audioPart)
                if (response.isSuccessful && response.body()?.success == true) {
                    response.body()?.data?.let { turn ->
                        _messages.value = _messages.value + turn
                    }
                } else {
                    _errorMessage.value = response.body()?.error ?: "Failed to process audio"
                }
            } catch (e: Exception) {
                _errorMessage.value = e.message ?: "Network error"
            } finally {
                _isProcessingAudio.value = false
            }
        }
    }

    fun loadScenarios(language: String, difficulty: String? = null) {
        viewModelScope.launch {
            try {
                val response = dialogueApi.getScenarios(language, difficulty)
                if (response.isSuccessful && response.body()?.success == true) {
                    _scenarios.value = response.body()?.data ?: emptyList()
                }
            } catch (e: Exception) {
                _errorMessage.value = e.message ?: "Network error"
            }
        }
    }

    fun clearError() {
        _errorMessage.value = null
    }
}
