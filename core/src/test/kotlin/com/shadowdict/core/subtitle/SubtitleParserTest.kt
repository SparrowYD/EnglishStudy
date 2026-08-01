package com.shadowdict.core.subtitle

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SubtitleParserTest {

    @Test
    fun parses_basic_srt() {
        val srt = """
            1
            00:00:12,345 --> 00:00:15,678
            Could I BE any more sarcastic?

            2
            00:00:16,000 --> 00:00:18,500
            Well, that's just great.
        """.trimIndent()

        val lines = SubtitleParser.parse(srt)
        assertEquals(2, lines.size)
        assertEquals(12_345L, lines[0].startMs)
        assertEquals(15_678L, lines[0].endMs)
        assertEquals("Could I BE any more sarcastic?", lines[0].text)
        assertEquals(0, lines[0].orderIndex)
        assertEquals(1, lines[1].orderIndex)
    }

    @Test
    fun parses_vtt_with_dot_millis_and_header() {
        val vtt = """
            WEBVTT

            00:00:01.000 --> 00:00:03.000
            Hello there

            00:00:03.000 --> 00:00:05.000
            General Kenobi
        """.trimIndent()

        val lines = SubtitleParser.parse(vtt)
        assertEquals(2, lines.size)
        assertEquals(1_000L, lines[0].startMs)
        assertEquals("Hello there", lines[0].text)
    }

    @Test
    fun strips_tags_and_directions_and_decodes_entities() {
        val srt = """
            1
            00:00:01,000 --> 00:00:02,000
            <i>[laughing]</i> Tom &amp; Jerry {\an8}are here
        """.trimIndent()

        val lines = SubtitleParser.parse(srt)
        assertEquals(1, lines.size)
        assertEquals("Tom & Jerry are here", lines[0].text)
    }

    @Test
    fun extracts_speaker_marker() {
        val srt = """
            1
            00:00:01,000 --> 00:00:02,000
            RACHEL: I got off the plane.
        """.trimIndent()

        val lines = SubtitleParser.parse(srt)
        assertEquals("RACHEL", lines[0].speaker)
        assertEquals("I got off the plane.", lines[0].text)
    }

    @Test
    fun skips_empty_text_lines() {
        val srt = """
            1
            00:00:01,000 --> 00:00:02,000
            [door slams]

            2
            00:00:02,000 --> 00:00:03,000
            Real dialogue.
        """.trimIndent()

        val lines = SubtitleParser.parse(srt)
        assertEquals(1, lines.size)
        assertEquals("Real dialogue.", lines[0].text)
    }

    @Test
    fun corrects_overlapping_timestamps() {
        val srt = """
            1
            00:00:01,000 --> 00:00:04,000
            First line

            2
            00:00:03,500 --> 00:00:06,000
            Second overlaps
        """.trimIndent()

        val lines = SubtitleParser.parse(srt)
        assertEquals(4_000L, lines[0].endMs)
        // Second cue's start is nudged to the first cue's end.
        assertEquals(4_000L, lines[1].startMs)
    }

    @Test
    fun multiline_text_is_joined() {
        val srt = """
            1
            00:00:01,000 --> 00:00:02,000
            This is one
            long sentence
        """.trimIndent()

        val lines = SubtitleParser.parse(srt)
        assertEquals("This is one long sentence", lines[0].text)
    }

    @Test
    fun timecode_parses_hours() {
        val parsed = SubtitleParser.parseTimecode("01:02:03,004 --> 01:02:05,006")
        assertEquals(3_723_004L, parsed!!.first)
        assertEquals(3_725_006L, parsed.second)
    }

    @Test
    fun no_speaker_when_absent() {
        val (speaker, text) = SubtitleParser.clean("Just normal text here")
        assertNull(speaker)
        assertEquals("Just normal text here", text)
    }

    @Test
    fun padding_widens_local_and_youtube_differently() {
        assertEquals(800L, PlaybackTiming.paddedStart(1_000L, isYouTube = false))
        assertEquals(500L, PlaybackTiming.paddedStart(1_000L, isYouTube = true))
        assertTrue(
            PlaybackTiming.paddedEnd(1_000L, isYouTube = true) >
                PlaybackTiming.paddedEnd(1_000L, isYouTube = false),
        )
    }
}
