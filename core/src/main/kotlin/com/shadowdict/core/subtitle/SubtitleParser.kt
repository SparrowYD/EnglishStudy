package com.shadowdict.core.subtitle

/**
 * One parsed subtitle cue.
 *
 * @param speaker extracted from a leading `NAME:` marker, if any (spec §10)
 */
data class ParsedLine(
    val orderIndex: Int,
    val startMs: Long,
    val endMs: Long,
    val text: String,
    val speaker: String? = null,
)

/**
 * SRT / VTT subtitle parser (spec §10).
 *
 * Blocks are separated by blank lines. A block's timecode line holds
 * `start --> end`; SRT uses `,` and VTT uses `.` for milliseconds. Text lines
 * are joined with a space and cleaned:
 *   - formatting tags (`<i>`, `<b>`, `{\an8}`) removed
 *   - a leading speaker marker (`RACHEL:`) split into its own field
 *   - bracketed stage directions (`[laughing]`, `(SIGHS)`) removed
 *   - HTML entities decoded
 *   - empty results skipped
 *   - overlapping adjacent cues nudged so a later start >= the previous end
 */
object SubtitleParser {

    private val TIMECODE = Regex(
        """(\d{1,2}):(\d{2}):(\d{2})[.,](\d{1,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[.,](\d{1,3})"""
    )
    // VTT also allows MM:SS.mmm (no hours).
    private val TIMECODE_SHORT = Regex(
        """(\d{1,2}):(\d{2})[.,](\d{1,3})\s*-->\s*(\d{1,2}):(\d{2})[.,](\d{1,3})"""
    )
    private val TAG = Regex("""<[^>]*>""")
    private val CURLY = Regex("""\{[^}]*}""")
    private val BRACKETED = Regex("""[\[(][^\])]*[\])]""")
    private val SPEAKER = Regex("""^\s*([A-Z][A-Z0-9 .'&-]{0,24}):\s+""")
    private val WHITESPACE = Regex("\\s+")

    /** Parse raw subtitle file content (format auto-detected). */
    fun parse(content: String): List<ParsedLine> {
        val normalized = content.replace("\r\n", "\n").replace("\r", "\n")
        val blocks = normalized.split(Regex("\n[ \t]*\n"))

        val cues = ArrayList<ParsedLine>()
        var order = 0
        for (block in blocks) {
            val lines = block.split("\n").map { it.trim() }.filter { it.isNotEmpty() }
            if (lines.isEmpty()) continue
            // Skip VTT header / NOTE / STYLE blocks.
            if (lines[0].startsWith("WEBVTT") || lines[0].startsWith("NOTE") ||
                lines[0].startsWith("STYLE") || lines[0].startsWith("REGION")
            ) continue

            val timeLineIndex = lines.indexOfFirst { it.contains("-->") }
            if (timeLineIndex < 0) continue
            val time = parseTimecode(lines[timeLineIndex]) ?: continue

            val rawText = lines.drop(timeLineIndex + 1).joinToString(" ")
            val (speaker, cleaned) = clean(rawText)
            if (cleaned.isEmpty()) continue

            cues.add(ParsedLine(order++, time.first, time.second, cleaned, speaker))
        }

        return fixOverlaps(cues)
    }

    /** Parse a single timecode line into (startMs, endMs). */
    fun parseTimecode(line: String): Pair<Long, Long>? {
        TIMECODE.find(line)?.let { m ->
            val g = m.groupValues
            val start = toMs(g[1], g[2], g[3], g[4])
            val end = toMs(g[5], g[6], g[7], g[8])
            return start to end
        }
        TIMECODE_SHORT.find(line)?.let { m ->
            val g = m.groupValues
            val start = toMs("0", g[1], g[2], g[3])
            val end = toMs("0", g[4], g[5], g[6])
            return start to end
        }
        return null
    }

    private fun toMs(h: String, m: String, s: String, millis: String): Long {
        val ms = millis.padEnd(3, '0').take(3)
        return h.toLong() * 3_600_000 + m.toLong() * 60_000 + s.toLong() * 1_000 + ms.toLong()
    }

    /** Strip tags/directions/entities and split off a leading speaker marker. */
    fun clean(raw: String): Pair<String?, String> {
        var text = raw
        text = TAG.replace(text, "")
        text = CURLY.replace(text, "")
        text = BRACKETED.replace(text, " ")
        text = decodeEntities(text)

        var speaker: String? = null
        SPEAKER.find(text)?.let { m ->
            speaker = m.groupValues[1].trim()
            text = text.removeRange(m.range)
        }

        text = text.replace(WHITESPACE, " ").trim()
        return speaker to text
    }

    private fun decodeEntities(input: String): String = input
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&apos;", "'")
        .replace("&nbsp;", " ")

    /** Ensure a later cue's start is never before the previous cue's end. */
    private fun fixOverlaps(cues: List<ParsedLine>): List<ParsedLine> {
        if (cues.isEmpty()) return cues
        val out = ArrayList<ParsedLine>(cues.size)
        var prevEnd = Long.MIN_VALUE
        for (cue in cues) {
            val start = if (cue.startMs < prevEnd) prevEnd else cue.startMs
            val end = maxOf(cue.endMs, start)
            out.add(cue.copy(startMs = start, endMs = end))
            prevEnd = end
        }
        return out
    }
}
