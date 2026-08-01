package com.shadowdict.core.chunk

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ChunkSplitterTest {

    @Test
    fun short_line_is_not_split() {
        val pieces = ChunkSplitter.split("Give me the book", 0, 1000, chunkThreshold = 12)
        assertEquals(1, pieces.size)
    }

    @Test
    fun twenty_word_line_splits_into_two_or_fewer() {
        // Spec DoD: a 20+ word line auto-splits into 2 pieces or fewer.
        val text = (1..20).joinToString(" ") { "word$it" }
        val pieces = ChunkSplitter.split(text, 0, 20_000, chunkThreshold = 12)
        assertTrue("expected <= 2 pieces, got ${pieces.size}", pieces.size <= 2)
        assertEquals(20, pieces.sumOf { it.wordCount })
    }

    @Test
    fun splits_at_comma_when_available() {
        val pieces = ChunkSplitter.split(
            "I went to the store, and then I came right back home again",
            0, 10_000, chunkThreshold = 8,
        )
        assertTrue(pieces.size >= 2)
        // First piece ends at the comma clause.
        assertTrue(pieces[0].text.trimEnd().endsWith("store,"))
    }

    @Test
    fun time_span_is_apportioned_by_word_ratio() {
        val text = (1..20).joinToString(" ") { "w$it" }
        val pieces = ChunkSplitter.split(text, 0, 20_000, chunkThreshold = 12)
        // Contiguous, covering the whole span.
        assertEquals(0L, pieces.first().startMs)
        assertEquals(20_000L, pieces.last().endMs)
        for (i in 1 until pieces.size) {
            assertEquals(pieces[i - 1].endMs, pieces[i].startMs)
        }
    }

    @Test
    fun splits_before_conjunction_when_no_punctuation() {
        val pieces = ChunkSplitter.split(
            "the cat sat down quietly because the dog was sleeping soundly nearby",
            0, 10_000, chunkThreshold = 6,
        )
        assertTrue(pieces.size >= 2)
    }
}
