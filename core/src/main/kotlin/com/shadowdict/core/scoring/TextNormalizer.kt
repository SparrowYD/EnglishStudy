package com.shadowdict.core.scoring

/**
 * Text normalization for dictation scoring (spec §6.1).
 *
 * Produces the canonical token list that the aligner compares. The pipeline is:
 *   1. lowercase
 *   2. unify smart apostrophes (`’` -> `'`)
 *   3. strip punctuation (everything except the apostrophe, which contractions need)
 *   4. tokenize on whitespace
 *   5. expand contractions (may turn one token into several)
 *
 * Case, punctuation and contraction differences are erased here so that they do
 * not block a pass; they are surfaced only visually by the renderer.
 */
object TextNormalizer {

    /** Punctuation removed before comparison. The apostrophe is kept on purpose. */
    private val PUNCTUATION = charArrayOf(
        '.', ',', '!', '?', ';', ':', '"', '“', '”', '…', '-', '—',
        '(', ')', '[', ']', '{', '}', '/', '\\', '*', '_', '~',
    )
    private val PUNCTUATION_SET = PUNCTUATION.toHashSet()

    /** Normalize a single word to its comparison form (no contraction expansion). */
    fun normalizeWord(word: String): String {
        val sb = StringBuilder(word.length)
        for (ch in word) {
            val c = if (ch == '’' || ch == '‘') '\'' else ch.lowercaseChar()
            if (c !in PUNCTUATION_SET) sb.append(c)
        }
        return sb.toString().trim()
    }

    /**
     * Turn raw text into the canonical, contraction-expanded token list used for
     * alignment. Empty tokens are dropped, so empty input yields an empty list.
     */
    fun canonicalTokens(raw: String): List<String> {
        val result = ArrayList<String>()
        for (rawToken in raw.split(WHITESPACE)) {
            val normalized = normalizeWord(rawToken)
            if (normalized.isEmpty()) continue
            result.addAll(Contractions.expand(normalized))
        }
        return result
    }

    /**
     * Strict raw comparison used only when `strictPunctuation` is on (spec §6.4):
     * collapse whitespace and compare verbatim, punctuation and case included.
     */
    fun rawText(raw: String): String =
        raw.trim().replace(WHITESPACE, " ")

    private val WHITESPACE = Regex("\\s+")
}
