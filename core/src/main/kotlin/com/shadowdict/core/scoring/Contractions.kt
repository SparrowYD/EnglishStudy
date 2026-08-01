package com.shadowdict.core.scoring

/**
 * Contraction handling for dictation normalization (spec §6.1).
 *
 * The spec lists a fixed table of contractions and says to `expandContraction`
 * (e.g. `I'm` -> `i am`) and, per its own note, to tokenize *after* expansion
 * because one contraction can become several tokens.
 *
 * Two deliberate refinements over the literal pseudocode, required to make the
 * spec's own §6.5 acceptance cases pass:
 *
 *  1. Expansion is applied to BOTH the answer and the user input before
 *     alignment, so token counts stay consistent (`I am` and `I'm` both become
 *     `[i, am]`).
 *  2. Apostrophe-less variants (`Im` for `I'm`, `dont` for `don't`) are also
 *     recognized, because a learner typing `Im` for `I'm` must pass
 *     (case: `I'm fine.` / `Im fine` -> pass, 100%). Variants whose bare form
 *     collides with a common English word (`its`, `were`, `ill`, `id`, `lets`)
 *     are intentionally excluded to avoid corrupting normal words.
 */
object Contractions {

    /** The canonical table from spec §6.1 (apostrophe forms). */
    val TABLE: Map<String, String> = linkedMapOf(
        "i'm" to "i am", "you're" to "you are", "he's" to "he is", "she's" to "she is",
        "it's" to "it is", "we're" to "we are", "they're" to "they are",
        "don't" to "do not", "doesn't" to "does not", "didn't" to "did not",
        "can't" to "cannot", "won't" to "will not", "isn't" to "is not",
        "aren't" to "are not", "wasn't" to "was not", "weren't" to "were not",
        "i've" to "i have", "i'll" to "i will", "i'd" to "i would",
        "that's" to "that is", "what's" to "what is", "there's" to "there is",
        "let's" to "let us", "gonna" to "going to", "wanna" to "want to",
    )

    /**
     * Bare (apostrophe-stripped) forms that must NOT be treated as contractions
     * because they are ordinary English words in their own right.
     */
    private val UNSAFE_BARE_FORMS = setOf("its", "were", "ill", "id", "lets")

    /**
     * Full lookup used during normalization: the canonical table plus the safe
     * apostrophe-less variants, keyed by the exact token to match.
     */
    val LOOKUP: Map<String, String> = buildMap {
        for ((key, value) in TABLE) {
            put(key, value)
            val bare = key.replace("'", "")
            if (bare != key && bare !in UNSAFE_BARE_FORMS && bare !in this) {
                put(bare, value)
            }
        }
    }

    /**
     * Expand a single already-lowercased token into one or more tokens.
     * Non-contractions return a single-element list containing the token.
     */
    fun expand(token: String): List<String> {
        val replacement = LOOKUP[token] ?: return listOf(token)
        return replacement.split(' ').filter { it.isNotEmpty() }
    }
}
