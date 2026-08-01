package com.shadowdict.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import com.shadowdict.core.scoring.TokenType

/** Theme-aware colors for dictation feedback tokens (spec §6.3, §11 #7). */
data class ScoringColors(
    val correct: Color,
    val typo: Color,
    val wrong: Color,
    val extra: Color,
    val missing: Color,
) {
    fun forType(type: TokenType): Color = when (type) {
        TokenType.CORRECT -> correct
        TokenType.TYPO -> typo
        TokenType.WRONG -> wrong
        TokenType.EXTRA -> extra
        TokenType.MISSING -> missing
    }
}

val LightScoringColors = ScoringColors(
    correct = ScoringLight.Correct,
    typo = ScoringLight.Typo,
    wrong = ScoringLight.Wrong,
    extra = ScoringLight.Extra,
    missing = ScoringLight.Missing,
)

val DarkScoringColors = ScoringColors(
    correct = ScoringDark.Correct,
    typo = ScoringDark.Typo,
    wrong = ScoringDark.Wrong,
    extra = ScoringDark.Extra,
    missing = ScoringDark.Missing,
)

val LocalScoringColors = staticCompositionLocalOf { LightScoringColors }

object ScoringTheme {
    val colors: ScoringColors
        @Composable
        @ReadOnlyComposable
        get() = LocalScoringColors.current
}
