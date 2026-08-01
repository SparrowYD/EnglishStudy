package com.shadowdict.core.scoring

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The seven acceptance cases from spec §6.5, plus supporting edge cases.
 */
class DictationScorerTest {

    // | I'm fine. | Im fine | pass, 100% |
    @Test
    fun case1_apostropheless_contraction_passes() {
        val r = DictationScorer.score("I'm fine.", "Im fine")
        assertTrue("should pass", r.passed)
        assertEquals(100, r.accuracyPercent)
    }

    // | I am fine. | I'm fine. | pass, 100% (contraction expansion) |
    @Test
    fun case2_expanded_equals_contracted() {
        val r = DictationScorer.score("I am fine.", "I'm fine.")
        assertTrue(r.passed)
        assertEquals(100, r.accuracyPercent)
    }

    // | I could receive it | I could recieve it | fail, 1 TYPO, 87.5% |
    @Test
    fun case3_typo_is_orange_and_blocks_pass() {
        val r = DictationScorer.score("I could receive it", "I could recieve it")
        assertFalse(r.passed)
        assertEquals(1, r.typoCount)
        assertEquals(0, r.wrongCount)
        assertEquals(0.875f, r.accuracy, 0.0001f)
    }

    // | Give me the book | Give me book | fail, 1 MISSING, 75% |
    @Test
    fun case4_missing_word() {
        val r = DictationScorer.score("Give me the book", "Give me book")
        assertFalse(r.passed)
        assertEquals(1, r.missingCount)
        assertEquals(0.75f, r.accuracy, 0.0001f)
        assertEquals("the", r.tokens.first { it.type == TokenType.MISSING }.answer)
    }

    // | Give me book | Give me the book | fail, 1 EXTRA |
    @Test
    fun case5_extra_word() {
        val r = DictationScorer.score("Give me book", "Give me the book")
        assertFalse(r.passed)
        assertEquals(1, r.extraCount)
        assertEquals("the", r.tokens.first { it.type == TokenType.EXTRA }.input)
    }

    // | their car | they car | fail, WRONG (distance 2 but short word) |
    @Test
    fun case6_short_word_distance2_is_wrong_not_typo() {
        val r = DictationScorer.score("their car", "they car")
        assertFalse(r.passed)
        assertEquals(1, r.wrongCount)
        assertEquals(0, r.typoCount)
    }

    // | He said no | (empty) | fail, 0%, 3 MISSING |
    @Test
    fun case7_empty_input_all_missing() {
        val r = DictationScorer.score("He said no", "")
        assertFalse(r.passed)
        assertEquals(0, r.accuracyPercent)
        assertEquals(3, r.missingCount)
    }

    // ── Supporting cases ──

    @Test
    fun perfect_match_passes() {
        val r = DictationScorer.score("Could I BE any more sarcastic?", "could i be any more sarcastic")
        assertTrue(r.passed)
        assertEquals(100, r.accuracyPercent)
        assertTrue(r.tokens.all { it.type == TokenType.CORRECT })
    }

    @Test
    fun dont_expands_to_do_not() {
        val r = DictationScorer.score("I don't know", "I do not know")
        assertTrue(r.passed)
    }

    @Test
    fun single_char_typo_in_long_word_is_typo() {
        val r = DictationScorer.score("beautiful day", "beatiful day")
        assertEquals(1, r.typoCount)
        assertFalse(r.passed)
    }

    @Test
    fun strict_punctuation_requires_exact_match() {
        val lenient = DictationScorer.score("I'm fine.", "im fine", strictPunctuation = false)
        assertTrue(lenient.passed)
        val strict = DictationScorer.score("I'm fine.", "im fine", strictPunctuation = true)
        assertFalse(strict.passed)
        val strictExact = DictationScorer.score("I'm fine.", "I'm fine.", strictPunctuation = true)
        assertTrue(strictExact.passed)
    }

    @Test
    fun wrong_word_is_red() {
        val r = DictationScorer.score("the weather is nice", "the elephant is nice")
        assertEquals(1, r.wrongCount)
        assertFalse(r.passed)
    }

    @Test
    fun char_levenshtein_matches_spec_examples() {
        assertEquals(2, WordAligner.charLevenshtein("receive", "recieve"))
        assertEquals(2, WordAligner.charLevenshtein("their", "they"))
        assertEquals(0, WordAligner.charLevenshtein("book", "book"))
        assertEquals(3, WordAligner.charLevenshtein("", "abc"))
    }
}
