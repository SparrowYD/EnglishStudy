package com.shadowdict.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider

private val LightColors = lightColorScheme(
    primary = Blue500,
    secondary = Orange500,
)

private val DarkColors = darkColorScheme(
    primary = Blue200,
    secondary = Orange500,
)

@Composable
fun ShadowDictTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColors else LightColors
    val scoringColors = if (darkTheme) DarkScoringColors else LightScoringColors

    CompositionLocalProvider(LocalScoringColors provides scoringColors) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = ShadowDictTypography,
            content = content,
        )
    }
}
