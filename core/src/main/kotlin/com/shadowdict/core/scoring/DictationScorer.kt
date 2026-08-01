package com.shadowdict.core.scoring

/**
 * Entry point for dictation scoring (spec §6).
 *
 * ```
 * val result = DictationScorer.score(answer = "I'm fine.", input = "Im fine")
 * result.accuracy // 1.0f
 * result.passed   // true
 * ```
 */
object DictationScorer {

    /**
     * Score a single attempt.
     *
     * @param answer            the correct line
     * @param input             what the user typed
     * @param strictPunctuation when true, requires a verbatim raw match (spec §6.4)
     */
    fun score(answer: String, input: String, strictPunctuation: Boolean = false): ScoreResult {
        val answerTokens = TextNormalizer.canonicalTokens(answer)
        val inputTokens = TextNormalizer.canonicalTokens(input)
        val tokens = WordAligner.align(answerTokens, inputTokens)

        val accuracy = computeAccuracy(tokens)
        val passed = isPassed(tokens, answer, input, strictPunctuation)
        return ScoreResult(tokens, accuracy, passed)
    }

    /**
     * Accuracy per spec §6.4: CORRECT scores 1.0, TYPO 0.5, EXTRA is a 0.5
     * penalty, and MISSING/WRONG score 0. Divided by the number of answer words
     * (all tokens except EXTRA), clamped to [0,1].
     */
    fun computeAccuracy(tokens: List<ScoreToken>): Float {
        val total = tokens.count { it.type != TokenType.EXTRA }
        if (total == 0) {
            // No answer words: perfect only if the user also typed nothing extra.
            return if (tokens.isEmpty()) 1f else 0f
        }
        val score = tokens.count { it.type == TokenType.CORRECT } * 1.0f +
            tokens.count { it.type == TokenType.TYPO } * 0.5f
        val penalty = tokens.count { it.type == TokenType.EXTRA } * 0.5f
        return ((score - penalty) / total).coerceIn(0f, 1f)
    }

    /**
     * Pass judgement per spec §6.4.
     *
     * Non-strict: the meaning must match completely — no WRONG, MISSING or EXTRA
     * words. TYPO also blocks a pass: the §6.4 note ("TYPO는 통과 불가 → 철자까지
     * 맞춰야 함") and case §6.5 `receive`/`recieve` both require spelling to be
     * exact, so a pass is equivalent to every token being CORRECT. Case,
     * punctuation and contraction differences never block a pass — they are only
     * shown visually.
     *
     * Strict: a verbatim raw comparison including punctuation and case.
     */
    fun isPassed(
        tokens: List<ScoreToken>,
        answer: String,
        input: String,
        strictPunctuation: Boolean,
    ): Boolean {
        if (strictPunctuation) {
            return TextNormalizer.rawText(input) == TextNormalizer.rawText(answer)
        }
        return tokens.all { it.type == TokenType.CORRECT } && tokens.isNotEmpty()
    }
}
