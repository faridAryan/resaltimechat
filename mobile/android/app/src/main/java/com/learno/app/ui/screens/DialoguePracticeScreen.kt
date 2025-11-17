package com.learno.app.ui.screens

import android.Manifest
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import com.learno.app.data.model.DialogueTurn
import com.learno.app.ui.viewmodel.DialogueViewModel
import com.learno.app.utils.AudioRecordingManager
import kotlinx.coroutines.launch

@OptIn(ExperimentalPermissionsApi::class, ExperimentalMaterial3Api::class)
@Composable
fun DialoguePracticeScreen(
    mode: String,
    title: String,
    language: String,
    difficulty: String,
    onBack: () -> Unit
) {
    val viewModel: DialogueViewModel = viewModel()
    val context = LocalContext.current
    val audioManager = remember { AudioRecordingManager(context) }

    val currentSession by viewModel.currentSession.collectAsState()
    val messages by viewModel.messages.collectAsState()
    val isProcessing by viewModel.isProcessingAudio.collectAsState()
    val isRecording by audioManager.isRecording.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()

    val micPermissionState = rememberPermissionState(Manifest.permission.RECORD_AUDIO)
    val listState = rememberLazyListState()
    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        if (currentSession == null) {
            viewModel.startSession(language, mode, null, difficulty)
        }
    }

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            coroutineScope.launch {
                listState.animateScrollToItem(messages.size - 1)
            }
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            audioManager.release()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(title) },
                navigationIcon = {
                    IconButton(onClick = {
                        viewModel.endSession()
                        onBack()
                    }) {
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
        ) {
            // Messages List
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(messages) { message ->
                    MessageBubble(message = message)
                }

                if (isProcessing) {
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.Center
                        ) {
                            CircularProgressIndicator(modifier = Modifier.size(24.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Processing...", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }

            Divider()

            // Recording Controls
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                if (isRecording) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(12.dp)
                                .background(Color.Red, shape = CircleShape)
                        )
                        Text(
                            "Recording...",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.Red
                        )
                    }
                }

                // Microphone Button
                FloatingActionButton(
                    onClick = {
                        if (isRecording) {
                            audioManager.stopRecording()?.let { file ->
                                viewModel.processAudio(file, language)
                            }
                        } else {
                            if (micPermissionState.status.isGranted) {
                                audioManager.startRecording()
                            } else {
                                micPermissionState.launchPermissionRequest()
                            }
                        }
                    },
                    containerColor = if (isRecording) Color.Red else MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(80.dp)
                ) {
                    Icon(
                        imageVector = if (isRecording) Icons.Default.Stop else Icons.Default.Mic,
                        contentDescription = if (isRecording) "Stop" else "Record",
                        modifier = Modifier.size(40.dp)
                    )
                }

                Text(
                    text = if (isRecording) "Tap to stop" else "Tap to speak",
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }
    }

    // Error Dialog
    errorMessage?.let { error ->
        AlertDialog(
            onDismissRequest = { viewModel.clearError() },
            title = { Text("Error") },
            text = { Text(error) },
            confirmButton = {
                TextButton(onClick = { viewModel.clearError() }) {
                    Text("OK")
                }
            }
        )
    }
}

@Composable
fun MessageBubble(message: DialogueTurn) {
    val isUser = message.speaker == "user"

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
    ) {
        if (isUser) Spacer(modifier = Modifier.width(50.dp))

        Column(
            horizontalAlignment = if (isUser) Alignment.End else Alignment.Start
        ) {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = if (isUser) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                tonalElevation = 2.dp
            ) {
                Text(
                    text = message.transcript,
                    modifier = Modifier.padding(12.dp),
                    color = if (isUser) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
                )
            }

            message.pronunciationScore?.let { score ->
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(top = 4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.VoiceOverOff,
                        contentDescription = null,
                        modifier = Modifier.size(12.dp),
                        tint = scoreColor(score)
                    )
                    Text(
                        text = "Pronunciation: ${score.toInt()}%",
                        style = MaterialTheme.typography.bodySmall,
                        color = scoreColor(score)
                    )
                }
            }
        }

        if (!isUser) Spacer(modifier = Modifier.width(50.dp))
    }
}

private fun scoreColor(score: Double): Color {
    return when {
        score >= 80 -> Color(0xFF4CAF50)
        score >= 60 -> Color(0xFFFF9800)
        else -> Color(0xFFF44336)
    }
}
