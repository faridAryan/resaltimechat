package com.learno.app.ui.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.learno.app.ui.viewmodel.AuthViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegisterScreen(
    authViewModel: AuthViewModel,
    onBack: () -> Unit,
    onRegisterSuccess: () -> Unit
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var nativeLanguage by remember { mutableStateOf("english") }
    var selectedLanguages by remember { mutableStateOf(setOf<String>()) }

    val isLoading by authViewModel.isLoading.collectAsState()
    val errorMessage by authViewModel.errorMessage.collectAsState()
    val isAuthenticated by authViewModel.isAuthenticated.collectAsState()

    val supportedLanguages = listOf(
        "spanish", "french", "german", "italian", "portuguese",
        "russian", "chinese", "japanese", "korean", "arabic"
    )

    LaunchedEffect(isAuthenticated) {
        if (isAuthenticated) {
            onRegisterSuccess()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Sign Up") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(24.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "Create Your Account",
                style = MaterialTheme.typography.headlineMedium
            )

            OutlinedTextField(
                value = username,
                onValueChange = { username = it },
                label = { Text("Username") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Password") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            Text(
                text = "Learning Languages",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(top = 8.dp)
            )

            supportedLanguages.forEach { language ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = language.capitalize(),
                        modifier = Modifier.align(Alignment.CenterVertically)
                    )
                    Checkbox(
                        checked = selectedLanguages.contains(language),
                        onCheckedChange = { checked ->
                            selectedLanguages = if (checked) {
                                selectedLanguages + language
                            } else {
                                selectedLanguages - language
                            }
                        }
                    )
                }
            }

            errorMessage?.let { error ->
                Text(
                    text = error,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            Button(
                onClick = {
                    authViewModel.register(
                        email = email,
                        password = password,
                        username = username,
                        nativeLanguage = nativeLanguage,
                        targetLanguages = selectedLanguages.toList()
                    )
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                enabled = !isLoading &&
                        email.isNotEmpty() &&
                        password.isNotEmpty() &&
                        username.isNotEmpty() &&
                        selectedLanguages.isNotEmpty()
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text("Create Account")
                }
            }
        }
    }
}

private fun String.capitalize(): String {
    return this.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
}
