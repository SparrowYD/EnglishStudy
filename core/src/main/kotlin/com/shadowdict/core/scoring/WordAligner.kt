package com.shadowdict.core.scoring

/**
 * Word-level alignment via Levenshtein DP (spec §6.2).
 *
 * A whole-string `==` comparison is deliberately never used, because it cannot
 * point at *where* the answer went wrong. Instead we compute the minimum edit
 * distance between the answer and input token lists and back-trace it into a
 * list of [ScoreToken]s (correct / substituted / missing / extra).
 */
object WordAligner {

    /**
     * Align two already-canonical token lists.
     *
     * @param answerWords canonical answer tokens (see [TextNormalizer.canonicalTokens])
     * @param inputWords  canonical input tokens
     */
    fun align(answerWords: List<String>, inputWords: List<String>): List<ScoreToken> {
        val n = answerWords.size
        val m = inputWords.size

        // dp[i][j] = min edit cost to match first i answer words with first j input words.
        val dp = Array(n + 1) { IntArray(m + 1) }
        for (i in 0..n) dp[i][0] = i
        for (j in 0..m) dp[0][j] = j

        for (i in 1..n) {
            for (j in 1..m) {
                val cost = if (answerWords[i - 1] == inputWords[j - 1]) 0 else 1
                dp[i][j] = minOf(
                    dp[i - 1][j] + 1,          // MISSING (answer word omitted)
                    dp[i][j - 1] + 1,          // EXTRA (input word not in answer)
                    dp[i - 1][j - 1] + cost,   // match or substitution
                )
            }
        }

        // Back-trace, preferring the diagonal (substitution/match) then MISSING then EXTRA,
        // matching the spec's ordering.
        val result = ArrayDeque<ScoreToken>()
        var i = n
        var j = m
        while (i > 0 || j > 0) {
            val a = if (i > 0) answerWords[i - 1] else null
            val b = if (j > 0) inputWords[j - 1] else null
            val cost = if (i > 0 && j > 0 && a == b) 0 else 1

            when {
                i > 0 && j > 0 && dp[i][j] == dp[i - 1][j - 1] + cost -> {
                    val token = if (cost == 0) {
                        ScoreToken(TokenType.CORRECT, a, b)
                    } else {
                        classifySubstitution(a!!, b!!)
                    }
                    result.addFirst(token)
                    i--; j--
                }
                i > 0 && dp[i][j] == dp[i - 1][j] + 1 -> {
                    result.addFirst(ScoreToken(TokenType.MISSING, a, null))
                    i--
                }
                else -> {
                    result.addFirst(ScoreToken(TokenType.EXTRA, null, b))
                    j--
                }
            }
        }
        return result.toList()
    }

    /**
     * Decide whether a substitution is a near-miss typo (orange) or a genuinely
     * wrong word (red), based on character-level edit distance.
     *
     * Spec §6.2 gives `d <= 2 and d <= maxLen/2`. That literal rule mislabels the
     * spec's own case `their` / `they` (distance 2, short word) as a typo when it
     * must be WRONG. We tighten the length guard to `3 * d <= maxLen`, which keeps
     * `receive`/`recieve` (d=2, len 7) a TYPO while making `their`/`they`
     * (d=2, len 5) a WRONG — satisfying both §6.5 cases.
     */
    private fun classifySubstitution(answer: String, input: String): ScoreToken {
        val d = charLevenshtein(answer, input)
        val maxLen = maxOf(answer.length, input.length)
        return if (d <= 2 && 3 * d <= maxLen) {
            ScoreToken(TokenType.TYPO, answer, input)
        } else {
            ScoreToken(TokenType.WRONG, answer, input)
        }
    }

    /** Standard character-level Levenshtein distance. */
    fun charLevenshtein(a: String, b: String): Int {
        if (a == b) return 0
        if (a.isEmpty()) return b.length
        if (b.isEmpty()) return a.length

        var prev = IntArray(b.length + 1) { it }
        var curr = IntArray(b.length + 1)
        for (i in 1..a.length) {
            curr[0] = i
            for (j in 1..b.length) {
                val cost = if (a[i - 1] == b[j - 1]) 0 else 1
                curr[j] = minOf(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
            }
            val tmp = prev; prev = curr; curr = tmp
        }
        return prev[b.length]
    }
}
