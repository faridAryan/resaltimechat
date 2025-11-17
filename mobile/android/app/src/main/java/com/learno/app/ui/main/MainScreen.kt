package com.learno.app.ui.main

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.learno.app.ui.screens.*

@Composable
fun MainScreen(onLogout: () -> Unit) {
    val navController = rememberNavController()
    var selectedTab by remember { mutableStateOf(0) }

    val tabs = listOf(
        BottomNavItem("home", "Home", Icons.Default.Home),
        BottomNavItem("stories", "Stories", Icons.Default.Book),
        BottomNavItem("vocabulary", "Vocabulary", Icons.Default.School),
        BottomNavItem("practice", "Practice", Icons.Default.Mic),
        BottomNavItem("progress", "Progress", Icons.Default.BarChart)
    )

    Scaffold(
        bottomBar = {
            NavigationBar {
                tabs.forEachIndexed { index, item ->
                    NavigationBarItem(
                        icon = { Icon(item.icon, contentDescription = item.label) },
                        label = { Text(item.label) },
                        selected = selectedTab == index,
                        onClick = {
                            selectedTab = index
                            navController.navigate(item.route) {
                                popUpTo("home") { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        }
                    )
                }
            }
        }
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = "home",
            modifier = Modifier.padding(paddingValues)
        ) {
            composable("home") { HomeScreen() }
            composable("stories") { StoriesScreen() }
            composable("vocabulary") { VocabularyScreen() }
            composable("practice") { PracticeScreen() }
            composable("progress") { ProgressScreen() }
        }
    }
}

data class BottomNavItem(
    val route: String,
    val label: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector
)
