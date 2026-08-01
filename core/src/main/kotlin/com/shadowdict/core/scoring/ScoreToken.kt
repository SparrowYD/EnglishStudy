package com.shadowdict.core.scoring

/**
 * Per-word classification produced by the aligner (spec §6.3).
 *
 * | type    | color (spec) | meaning                                   |
 * |---------|--------------|-------------------------------------------|
 * | CORRECT | green        | typed word matches the answer             |
 * | TYPO    | orange       | close misspelling of the answer word      |
 * | WRONG   | red          | wrong word (too far to be a typo)         |
 * | EXTRA   | grey         | word the user typed that is not in answer |
 * | MISSING | blue         | answer word the user omitted              |
 */
enum class TokenType { CORRECT, TYPO, WRONG, EXTRA, MISSING }

/**
 * One aligned token.
 *
 * @param answer the canonical answer word, or null for [TokenType.EXTRA]
 * @param input  the canonical typed word, or null for [TokenType.MISSING]
 */
data class ScoreToken(
    val type: TokenType,
    val answer: String?,
    val input: String?,
)

/**
 * Full result of scoring one dictation attempt.
 *
 * @param accuracy value in [0,1] per spec §6.4
 * @param passed   whether the attempt counts as a pass (meaning-complete match)
 */
data class ScoreResult(
    val tokens: List<ScoreToken>,
    val accuracy: Float,
    val passed: Boolean,
) {
    val correctCount: Int get() = tokens.count { it.type == TokenType.CORRECT }
    val typoCount: Int get() = tokens.count { it.type == TokenType.TYPO }
    val wrongCount: Int get() = tokens.count { it.type == TokenType.WRONG }
    val extraCount: Int get() = tokens.count { it.type == TokenType.EXTRA }
    val missingCount: Int get() = tokens.count { it.type == TokenType.MISSING }

    /** Accuracy as a whole-number percentage, for display (e.g. 87). */
    val accuracyPercent: Int get() = Math.round(accuracy * 100f)
}
