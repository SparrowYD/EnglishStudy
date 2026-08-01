package com.shadowdict.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.navigation.NavType
import com.shadowdict.di.AppContainer
import com.shadowdict.ui.addsource.AddSourceScreen
import com.shadowdict.ui.home.HomeScreen
import com.shadowdict.ui.navigation.Routes
import com.shadowdict.ui.navigation.TopDestination
import com.shadowdict.ui.settings.SettingsScreen
import com.shadowdict.ui.sources.SourceLinesScreen
import com.shadowdict.ui.sources.SourcesScreen
import com.shadowdict.ui.stats.StatsScreen
import com.shadowdict.ui.study.StudyScreen

@Composable
fun ShadowDictApp(container: AppContainer) {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    val showBottomBar = currentRoute in TopDestination.entries.map { it.route }

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    val currentDestination = backStackEntry?.destination
                    TopDestination.entries.forEach { dest ->
                        NavigationBarItem(
                            selected = currentDestination?.hierarchy?.any { it.route == dest.route } == true,
                            onClick = {
                                navController.navigate(dest.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(dest.icon, contentDescription = dest.label) },
                            label = { Text(dest.label) },
                        )
                    }
                }
            }
        },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = Routes.HOME,
            modifier = Modifier.padding(padding),
        ) {
            composable(Routes.HOME) {
                HomeScreen(
                    onStartStudy = { navController.navigate(Routes.STUDY) },
                    onAddSource = { navController.navigate(Routes.ADD_SOURCE) },
                    onOpenSource = { id -> navController.navigate(Routes.sourceLines(id)) },
                )
            }
            composable(Routes.SOURCES) {
                SourcesScreen(
                    onAddSource = { navController.navigate(Routes.ADD_SOURCE) },
                    onOpenSource = { id -> navController.navigate(Routes.sourceLines(id)) },
                )
            }
            composable(Routes.STATS) { StatsScreen() }
            composable(Routes.SETTINGS) { SettingsScreen() }
            composable(Routes.ADD_SOURCE) {
                AddSourceScreen(onDone = { navController.popBackStack() })
            }
            composable(Routes.STUDY) {
                StudyScreen(
                    container = container,
                    onExit = { navController.popBackStack() },
                )
            }
            composable(
                route = "${Routes.SOURCE_LINES}/{sourceId}",
                arguments = listOf(navArgument("sourceId") { type = NavType.LongType }),
            ) { entry ->
                val sourceId = entry.arguments?.getLong("sourceId") ?: 0L
                SourceLinesScreen(
                    container = container,
                    sourceId = sourceId,
                    onBack = { navController.popBackStack() },
                )
            }
        }
    }
}
