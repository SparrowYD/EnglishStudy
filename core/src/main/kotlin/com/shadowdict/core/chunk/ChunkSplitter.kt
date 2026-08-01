package com.shadowdict.core.chunk

/**
 * A piece of a (possibly split) subtitle line.
 *
 * @param startMs / [endMs] the sub-span apportioned from the original line by
 *   word-count ratio (spec §4).
 */
data class ChunkPiece(
    val text: String,
    val startMs: Long,
    val endMs: Long,
) {
    val wordCount: Int get() = text.trim().split(WHITESPACE).count { it.isNotBlank() }

    private companion object {
        val WHITESPACE = Regex("\\s+")
    }
}

/**
 * Automatic chunk splitting for long lines (spec §4).
 *
 * A line with `wordCount > chunkThreshold` is split so each learning card stays
 * dictatable. Split-point priority:
 *   1. after a comma / semicolon / dash
 *   2. before a coordinating/subordinating conjunction
 *   3. the midpoint, if neither is available
 *
 * Each piece's time span is apportioned from the original by word-count ratio.
 * Splitting recurses until every piece is within the threshold, always cutting
 * nearest the middle so pieces stay balanced (a 20-word line becomes two ~10s).
 */
object ChunkSplitter {

    private val CONJUNCTIONS = setOf(
        "and", "but", "or", "so", "because", "when", "if", "that", "which",
    )
    private val WHITESPACE = Regex("\\s+")

    fun split(text: String, startMs: Long, endMs: Long, chunkThreshold: Int = 12): List<ChunkPiece> {
        val words = text.trim().split(WHITESPACE).filter { it.isNotBlank() }
        if (words.size <= chunkThreshold || words.size < 2) {
            return listOf(ChunkPiece(text.trim(), startMs, endMs))
        }
        val cut = chooseSplitIndex(words)
        val leftWords = words.subList(0, cut)
        val rightWords = words.subList(cut, words.size)

        // Apportion the time span by word count.
        val span = (endMs - startMs).coerceAtLeast(0)
        val boundary = startMs + span * leftWords.size / words.size

        val left = split(leftWords.joinToString(" "), startMs, boundary, chunkThreshold)
        val right = split(rightWords.joinToString(" "), boundary, endMs, chunkThreshold)
        return left + right
    }

    /**
     * Choose a split index in `1 until words.size`, honoring the priority order
     * and, within a tier, preferring the candidate nearest the middle.
     */
    private fun chooseSplitIndex(words: List<String>): Int {
        val mid = words.size / 2

        // Tier 1: after a word ending in , ; or a dash (or a standalone dash token).
        val afterPunct = ArrayList<Int>()
        // Tier 2: before a conjunction.
        val beforeConj = ArrayList<Int>()

        for (i in 0 until words.size) {
            val w = words[i]
            val stripped = w.trimEnd('.', ',', ';', ':', '!', '?', '—', '-', '"', '”')
            if (i in 1 until words.size) {
                if (endsWithSplitPunct(w) || w == "—" || w == "-") afterPunct.add(i + 1)
            }
            if (i in 1 until words.size && stripped.lowercase() in CONJUNCTIONS) {
                beforeConj.add(i)
            }
        }

        val candidates = when {
            afterPunct.any { it in 1 until words.size } ->
                afterPunct.filter { it in 1 until words.size }
            beforeConj.isNotEmpty() -> beforeConj
            else -> listOf(mid)
        }
        return candidates.minByOrNull { kotlin.math.abs(it - mid) } ?: mid
    }

    private fun endsWithSplitPunct(word: String): Boolean =
        word.endsWith(",") || word.endsWith(";") || word.endsWith("—") ||
            (word.endsWith("-") && word.length > 1)
}
