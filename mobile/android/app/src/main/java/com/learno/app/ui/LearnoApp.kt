package com.learno.app.ui

import androidx.compose.runtime.*
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.learno.app.ui.auth.LoginScreen
import com.learno.app.ui.main.MainScreen
import com.learno.app.ui.viewmodel.AuthViewModel

@Composable
fun LearnoApp() {
    val navController = rememberNavController()
    val authViewModel: AuthViewModel = viewModel()
    val isAuthenticated by authViewModel.isAuthenticated.collectAsState()

    NavHost(
        navController = navController,
        startDestination = if (isAuthenticated) "main" else "login"
    ) {
        composable("login") {
            LoginScreen(
                authViewModel = authViewModel,
                onLoginSuccess = {
                    navController.navigate("main") {
                        popUpTo("login") { inclusive = true }
                    }
                }
            )
        }

        composable("main") {
            MainScreen(
                onLogout = {
                    authViewModel.logout()
                    navController.navigate("login") {
                        popUpTo("main") { inclusive = true }
                    }
                }
            )
        }
    }
}
