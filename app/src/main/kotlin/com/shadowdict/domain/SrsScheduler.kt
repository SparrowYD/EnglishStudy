package com.shadowdict.domain

import com.shadowdict.data.local.entity.LineStatus
import com.shadowdict.data.local.entity.SubLine
import java.time.LocalDate
import java.time.ZoneId

/**
 * Spaced-repetition scheduling (spec §8).
 *
 * Intervals by stage: 0 -> same day, 1 -> +1d, 2 -> +3d, 3 -> +7d, 4 -> +14d.
 * After stage 4 the line becomes MASTERED. `nextReviewAt` is midnight + interval.
 */
object SrsScheduler {

    private val INTERVAL_DAYS = intArrayOf(0, 1, 3, 7, 14)
    private const val MAX_STAGE = 4

    /**
     * Apply a passing result to a line and return the updated copy.
     *
     * @param hintLevelUsed highest hint level used this pass
     * @param attemptCount  attempts taken to pass this pass
     */
    fun onPass(
        line: SubLine,
        hintLevelUsed: Int,
        attemptCount: Int,
        accuracy: Float,
        now: Long = System.currentTimeMillis(),
        zone: ZoneId = ZoneId.systemDefault(),
    ): SubLine {
        val newStage = when {
            hintLevelUsed == 0 && attemptCount == 1 -> line.srsStage + 1
            hintLevelUsed >= 3 -> line.srsStage            // heavy hints -> stay
            else -> line.srsStage + 1
        }.coerceIn(0, MAX_STAGE)

        val mastered = newStage >= MAX_STAGE
        val intervalDays = INTERVAL_DAYS[newStage]
        val nextReview = nextMidnightPlusDays(now, intervalDays, zone)

        return line.copy(
            srsStage = newStage,
            status = if (mastered) LineStatus.MASTERED else LineStatus.LEARNING,
            nextReviewAt = if (mastered) null else nextReview,
            bestAccuracy = maxOf(line.bestAccuracy, accuracy),
            hintLevelUsed = maxOf(line.hintLevelUsed, hintLevelUsed),
            attemptCount = line.attemptCount + attemptCount,
            completedAt = if (mastered) now else line.completedAt,
            // firstTryAccuracy is fixed on the very first attempt and never overwritten.
            firstTryAccuracy = line.firstTryAccuracy,
        )
    }

    /** Midnight of today (local) plus [days], as epoch millis. */
    fun nextMidnightPlusDays(now: Long, days: Int, zone: ZoneId = ZoneId.systemDefault()): Long {
        val today = LocalDate.ofInstant(java.time.Instant.ofEpochMilli(now), zone)
        val target = today.plusDays(days.toLong())
        return target.atStartOfDay(zone).toInstant().toEpochMilli()
    }
}
