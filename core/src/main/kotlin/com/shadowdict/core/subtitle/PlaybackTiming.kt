package com.shadowdict.core.subtitle

/**
 * Section-repeat padding (spec §10): subtitle timecodes are often tighter than
 * the actual utterance, so widen the loop a little. YouTube seeks are imprecise,
 * so it gets wider padding than local files (spec §11 #5).
 */
object PlaybackTiming {
    const val LOCAL_LEAD_MS = 200L
    const val LOCAL_TAIL_MS = 300L
    const val YOUTUBE_LEAD_MS = 500L
    const val YOUTUBE_TAIL_MS = 700L

    fun paddedStart(startMs: Long, isYouTube: Boolean = false): Long =
        (startMs - if (isYouTube) YOUTUBE_LEAD_MS else LOCAL_LEAD_MS).coerceAtLeast(0)

    fun paddedEnd(endMs: Long, isYouTube: Boolean = false): Long =
        endMs + if (isYouTube) YOUTUBE_TAIL_MS else LOCAL_TAIL_MS
}
