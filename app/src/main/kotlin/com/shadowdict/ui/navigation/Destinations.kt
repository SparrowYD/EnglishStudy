package com.shadowdict.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.VideoLibrary
import androidx.compose.ui.graphics.vector.ImageVector

object Routes {
    const val HOME = "home"
    const val SOURCES = "sources"
    const val STATS = "stats"
    const val SETTINGS = "settings"
    const val ADD_SOURCE = "add_source"
    const val STUDY = "study"
    const val SOURCE_LINES = "source_lines"
    fun sourceLines(id: Long) = "$SOURCE_LINES/$id"
}

enum class TopDestination(
    val route: String,
    val label: String,
    val icon: ImageVector,
) {
    HOME(Routes.HOME, "홈", Icons.Filled.Home),
    SOURCES(Routes.SOURCES, "자료", Icons.Filled.VideoLibrary),
    STATS(Routes.STATS, "통계", Icons.Filled.BarChart),
    SETTINGS(Routes.SETTINGS, "설정", Icons.Filled.Settings),
}
