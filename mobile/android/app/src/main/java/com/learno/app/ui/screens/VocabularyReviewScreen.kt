package com.learno.app.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.learno.app.data.model.VocabularyCard
import com.learno.app.ui.viewmodel.VocabularyViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VocabularyReviewScreen(
    language: String,
    onBack: () -> Void
) {
    val viewModel: VocabularyViewModel = viewModel()
    val dueCards by viewModel.dueCards.collectAsState()

    var currentCardIndex by remember { mutableStateOf(0) }
    var isFlipped by remember { mutableStateOf(false) }
    var reviewComplete by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.loadDueCards(language)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Review") },
                navigationIcon = {
                    IconButton(onClick = { onBack() }) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                },
                actions = {
                    if (dueCards.isNotEmpty() && !reviewComplete) {
                        TextButton(onClick = { reviewComplete = true }) {
                            Text("End Review")
                        }
                    }
                }
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                dueCards.isEmpty() -> {
                    // No cards to review
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            modifier = Modifier.size(80.dp),
                            tint = Color(0xFF4CAF50)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            "All caught up!",
                            style = MaterialTheme.typography.headlineMedium
                        )
                        Text(
                            "No cards due for review",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                reviewComplete -> {
                    // Review complete
                    ReviewCompletionScreen(
                        cardsReviewed = currentCardIndex,
                        onContinue = {
                            reviewComplete = false
                            currentCardIndex = 0
                            viewModel.loadDueCards(language)
                        }
                    )
                }

                else -> {
                    // Active review
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(16.dp)
                    ) {
                        // Progress
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "${currentCardIndex + 1} / ${dueCards.size}",
                                style = MaterialTheme.typography.headlineSmall
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        LinearProgressIndicator(
                            progress = (currentCardIndex.toFloat() / dueCards.size),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(modifier = Modifier.height(32.dp))

                        // Flashcard
                        FlashCard(
                            card = dueCards[currentCardIndex],
                            isFlipped = isFlipped,
                            modifier = Modifier
                                .fillMaxWidth()
                                .weight(1f)
                        )

                        Spacer(modifier = Modifier.height(24.dp))

                        // Flip/Answer Buttons
                        if (!isFlipped) {
                            Button(
                                onClick = { isFlipped = true },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("Show Answer")
                            }
                        } else {
                            SM2QualityButtons(
                                onQualitySelected = { quality ->
                                    viewModel.recordReview(dueCards[currentCardIndex].id, quality) {
                                        if (currentCardIndex < dueCards.size - 1) {
                                            currentCardIndex++
                                            isFlipped = false
                                        } else {
                                            reviewComplete = true
                                        }
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun FlashCard(
    card: VocabularyCard,
    isFlipped: Boolean,
    modifier: Modifier = Modifier
) {
    var rotationY by remember { mutableStateOf(0f) }

    LaunchedEffect(isFlipped) {
        animate(
            initialValue = if (isFlipped) 0f else 180f,
            targetValue = if (isFlipped) 180f else 0f,
            animationSpec = tween(durationMillis = 400)
        ) { value, _ ->
            rotationY = value
        }
    }

    Card(
        modifier = modifier
            .graphicsLayer {
                this.rotationY = rotationY
                cameraDistance = 12f * density
            },
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
        shape = RoundedCornerShape(16.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            contentAlignment = Alignment.Center
        ) {
            if (rotationY < 90f) {
                // Front - Word
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                    modifier = Modifier.graphicsLayer { this.rotationY = 0f }
                ) {
                    Text(
                        text = card.word,
                        style = MaterialTheme.typography.displayMedium,
                        textAlign = TextAlign.Center
                    )

                    card.partOfSpeech?.let { pos ->
                        Spacer(modifier = Modifier.height(8.dp))
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.secondaryContainer
                        ) {
                            Text(
                                text = pos,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }

                    card.ipa?.let { ipa ->
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "[$ipa]",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            } else {
                // Back - Translation & Examples
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                    modifier = Modifier.graphicsLayer { this.rotationY = 180f }
                ) {
                    Text(
                        text = card.translation,
                        style = MaterialTheme.typography.headlineMedium,
                        textAlign = TextAlign.Center
                    )

                    card.exampleSentences?.take(2)?.let { examples ->
                        if (examples.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(24.dp))
                            Divider()
                            Spacer(modifier = Modifier.height(16.dp))

                            Text(
                                "Examples:",
                                style = MaterialTheme.typography.labelLarge,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(8.dp))

                            examples.forEach { example ->
                                Text(
                                    "• $example",
                                    style = MaterialTheme.typography.bodyMedium,
                                    modifier = Modifier.padding(vertical = 4.dp)
                                )
                            }
                        }
                    }

                    card.mnemonic?.let { mnemonic ->
                        Spacer(modifier = Modifier.height(16.dp))
                        Divider()
                        Spacer(modifier = Modifier.height(16.dp))

                        Text(
                            "Mnemonic:",
                            style = MaterialTheme.typography.labelLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            mnemonic,
                            style = MaterialTheme.typography.bodyMedium,
                            fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun SM2QualityButtons(onQualitySelected: (Int) -> Unit) {
    Column(
        verticalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(
            "How well did you know this?",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.fillMaxWidth(),
            textAlign = TextAlign.Center
        )

        SM2Button(
            title = "Perfect",
            subtitle = "Easy recall",
            color = Color(0xFF4CAF50),
            quality = 5,
            onClick = { onQualitySelected(5) }
        )

        SM2Button(
            title = "Good",
            subtitle = "Correct with effort",
            color = Color(0xFF2196F3),
            quality = 4,
            onClick = { onQualitySelected(4) }
        )

        SM2Button(
            title = "Hard",
            subtitle = "Difficult to recall",
            color = Color(0xFFFF9800),
            quality = 3,
            onClick = { onQualitySelected(3) }
        )

        SM2Button(
            title = "Again",
            subtitle = "Incorrect",
            color = Color(0xFFF44336),
            quality = 0,
            onClick = { onQualitySelected(0) }
        )
    }
}

@Composable
fun SM2Button(
    title: String,
    subtitle: String,
    color: Color,
    quality: Int,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        colors = ButtonDefaults.buttonColors(containerColor = color),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(horizontalAlignment = Alignment.Start) {
                Text(title, style = MaterialTheme.typography.titleMedium)
                Text(subtitle, style = MaterialTheme.typography.bodySmall)
            }

            Text(
                quality.toString(),
                style = MaterialTheme.typography.headlineSmall
            )
        }
    }
}

@Composable
fun ReviewCompletionScreen(
    cardsReviewed: Int,
    onContinue: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.CheckCircle,
            contentDescription = null,
            modifier = Modifier.size(80.dp),
            tint = Color(0xFF4CAF50)
        )

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            "Review Complete!",
            style = MaterialTheme.typography.headlineMedium
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            "You reviewed $cardsReviewed cards",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(32.dp))

        Button(
            onClick = onContinue,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Continue Learning")
        }
    }
}
