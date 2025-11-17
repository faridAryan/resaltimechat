package com.learno.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.learno.app.data.model.*
import com.learno.app.data.remote.ApiClient
import com.learno.app.data.remote.api.VocabularyApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class VocabularyViewModel : ViewModel() {
    private val vocabularyApi = ApiClient.createService(VocabularyApi::class.java)

    private val _myDecks = MutableStateFlow<List<VocabularyDeck>>(emptyList())
    val myDecks: StateFlow<List<VocabularyDeck>> = _myDecks

    private val _publicDecks = MutableStateFlow<List<VocabularyDeck>>(emptyList())
    val publicDecks: StateFlow<List<VocabularyDeck>> = _publicDecks

    private val _dueCards = MutableStateFlow<List<VocabularyCard>>(emptyList())
    val dueCards: StateFlow<List<VocabularyCard>> = _dueCards

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage

    fun loadMyDecks(language: String) {
        viewModelScope.launch {
            _isLoading.value = true

            try {
                val response = vocabularyApi.getMyDecks(language)
                if (response.isSuccessful && response.body()?.success == true) {
                    _myDecks.value = response.body()?.data ?: emptyList()
                }
            } catch (e: Exception) {
                _errorMessage.value = e.message ?: "Network error"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun loadPublicDecks(language: String) {
        viewModelScope.launch {
            try {
                val response = vocabularyApi.getPublicDecks(language)
                if (response.isSuccessful && response.body()?.success == true) {
                    _publicDecks.value = response.body()?.data ?: emptyList()
                }
            } catch (e: Exception) {
                _errorMessage.value = e.message ?: "Network error"
            }
        }
    }

    fun loadDueCards(language: String) {
        viewModelScope.launch {
            try {
                val response = vocabularyApi.getDueCards(language)
                if (response.isSuccessful && response.body()?.success == true) {
                    _dueCards.value = response.body()?.data ?: emptyList()
                }
            } catch (e: Exception) {
                _errorMessage.value = e.message ?: "Network error"
            }
        }
    }

    fun generateDeck(language: String, theme: String, difficulty: String, cardCount: Int = 20) {
        viewModelScope.launch {
            _isLoading.value = true

            try {
                val request = mapOf(
                    "language" to language,
                    "theme" to theme,
                    "difficulty" to difficulty,
                    "cardCount" to cardCount
                )

                val response = vocabularyApi.generateDeck(request)
                if (response.isSuccessful && response.body()?.success == true) {
                    response.body()?.data?.let { deck ->
                        _myDecks.value = _myDecks.value + deck
                    }
                }
            } catch (e: Exception) {
                _errorMessage.value = e.message ?: "Network error"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun recordReview(cardId: String, quality: Int, onComplete: () -> Unit = {}) {
        viewModelScope.launch {
            try {
                val request = mapOf("quality" to quality)
                val response = vocabularyApi.recordReview(cardId, request)
                if (response.isSuccessful && response.body()?.success == true) {
                    onComplete()
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
