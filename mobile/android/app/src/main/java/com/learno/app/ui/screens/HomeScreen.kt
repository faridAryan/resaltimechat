package com.learno.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen() {
    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Home") })
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Text(
                    text = "Hello, Learner!",
                    style = MaterialTheme.typography.headlineMedium
                )
                Text(
                    text = "Keep up the great work!",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            item {
                StreakCard(currentStreak = 7, longestStreak = 15)
            }

            item {
                Text(
                    text = "Quick Actions",
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.padding(vertical = 8.dp)
                )
            }

            item {
                QuickActionsGrid()
            }
        }
    }
}

@Composable
fun StreakCard(currentStreak: Int, longestStreak: Int) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.LocalFireDepartment,
                contentDescription = "Streak",
                modifier = Modifier.size(48.dp),
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column {
                Text(
                    text = "$currentStreak Day Streak",
                    style = MaterialTheme.typography.titleLarge
                )
                Text(
                    text = "Longest: $longestStreak days",
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}

@Composable
fun QuickActionsGrid() {
    val actions = listOf(
        QuickAction("Read Story", Icons.Default.Book, MaterialTheme.colorScheme.secondary),
        QuickAction("Review Words", Icons.Default.School, MaterialTheme.colorScheme.tertiary),
        QuickAction("Practice Speaking", Icons.Default.Mic, MaterialTheme.colorScheme.primary),
        QuickAction("Write Essay", Icons.Default.Edit, MaterialTheme.colorScheme.error)
    )

    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.height(200.dp)
    ) {
        items(actions.size) { index ->
            QuickActionCard(actions[index])
        }
    }
}

@Composable
fun QuickActionCard(action: QuickAction) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(1f),
        colors = CardDefaults.cardColors(
            containerColor = action.color.copy(alpha = 0.1f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = action.icon,
                contentDescription = action.title,
                modifier = Modifier.size(48.dp),
                tint = action.color
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = action.title,
                style = MaterialTheme.typography.bodyMedium,
                color = action.color
            )
        }
    }
}

data class QuickAction(
    val title: String,
    val icon: ImageVector,
    val color: androidx.compose.ui.graphics.Color
)
