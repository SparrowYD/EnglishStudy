package com.shadowdict.domain

/**
 * Progressive hint ladder (spec §7). The more attempts a learner has spent on a
 * line, the more of the answer is revealed, so they never get stuck and quit.
 *
 * | attempt | level | content                                 |
 * |---------|-------|-----------------------------------------|
 * | 1       | 0     | none                                    |
 * | 2       | 1     | letter counts `_ _ _`                   |
 * | 3       | 2     | first letter `c _ _`                    |
 * | 4       | 3     | 0.75x speed + first two letters `co _`  |
 * | 5+      | 4     | reveal the answer for 3s, then hide     |
 */
object HintLadder {

    const val MAX_LEVEL = 4

    /** Map a 1-based attempt number to the hint level it unlocks. */
    fun levelForAttempt(attemptNumber: Int): Int = (attemptNumber - 1).coerceIn(0, MAX_LEVEL)

    /** At level 3+ playback slows to 0.75x automatically. */
    fun autoSlow(level: Int): Boolean = level >= 3

    /** At level 4 the answer is briefly revealed in full. */
    fun revealsAnswer(level: Int): Boolean = level >= MAX_LEVEL

    /**
     * Build the masked hint string for the whole answer at the given level.
     * Returns null for level 0 (no hint shown).
     */
    fun mask(answer: String, level: Int): String? {
        if (level <= 0) return null
        val words = answer.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }
        return words.joinToString("   ") { maskWord(it, level) }
    }

    private fun maskWord(word: String, level: Int): String {
        if (level >= MAX_LEVEL) return word
        val reveal = when (level) {
            1 -> 0
            2 -> 1
            else -> 2 // level 3
        }
        val sb = StringBuilder()
        word.forEachIndexed { index, c ->
            if (index < reveal && c.isLetterOrDigit()) sb.append(c) else if (c.isLetterOrDigit()) sb.append('_')
            else sb.append(c) // keep punctuation visible
            if (index < word.lastIndex) sb.append(' ')
        }
        return sb.toString()
    }
}
