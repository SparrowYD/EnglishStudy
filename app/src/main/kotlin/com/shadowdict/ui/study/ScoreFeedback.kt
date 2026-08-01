package com.shadowdict.ui.study

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.BaselineShift
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.sp
import com.shadowdict.core.scoring.ScoreResult
import com.shadowdict.core.scoring.ScoreToken
import com.shadowdict.core.scoring.TokenType
import com.shadowdict.ui.theme.ScoringTheme

/**
 * Renders the color-coded dictation feedback (spec §6.3). Each token is styled
 * by type: correct/green, typo/orange with the answer superscripted, wrong/red
 * struck through then the answer, extra/grey struck through, missing/blue
 * underscores.
 */
@Composable
fun ScoreFeedback(result: ScoreResult, modifier: Modifier = Modifier) {
    val colors = ScoringTheme.colors
    val annotated: AnnotatedString = buildAnnotatedString {
        result.tokens.forEachIndexed { index, token ->
            if (index > 0) append(" ")
            when (token.type) {
                TokenType.CORRECT -> withStyle(SpanStyle(color = colors.correct, fontWeight = FontWeight.Medium)) {
                    append(token.input ?: "")
                }
                TokenType.TYPO -> {
                    withStyle(SpanStyle(color = colors.typo, fontWeight = FontWeight.Medium)) {
                        append(token.input ?: "")
                    }
                    withStyle(
                        SpanStyle(
                            color = colors.typo,
                            baselineShift = BaselineShift.Superscript,
                            fontSize = 11.sp,
                        ),
                    ) {
                        append(token.answer ?: "")
                    }
                }
                TokenType.WRONG -> {
                    withStyle(
                        SpanStyle(color = colors.wrong, textDecoration = TextDecoration.LineThrough),
                    ) {
                        append(token.input ?: "")
                    }
                    withStyle(SpanStyle(color = colors.wrong, fontWeight = FontWeight.Bold)) {
                        append("→" + (token.answer ?: ""))
                    }
                }
                TokenType.EXTRA -> withStyle(
                    SpanStyle(color = colors.extra, textDecoration = TextDecoration.LineThrough),
                ) {
                    append(token.input ?: "")
                }
                TokenType.MISSING -> withStyle(
                    SpanStyle(color = colors.missing, fontWeight = FontWeight.Bold),
                ) {
                    append(underscores(token))
                }
            }
        }
    }
    Text(annotated, modifier = modifier, style = MaterialTheme.typography.bodyLarge)
}

private fun underscores(token: ScoreToken): String {
    val len = (token.answer ?: "").length.coerceAtLeast(1)
    return "_".repeat(len)
}
