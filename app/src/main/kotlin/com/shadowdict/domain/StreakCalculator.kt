package com.shadowdict.domain

import com.shadowdict.data.local.entity.DailySession
import java.time.LocalDate

/** Streak logic (spec §9). */
object StreakCalculator {

    /**
     * Walk backwards from today counting consecutive completed (or freeze-covered)
     * days. Today not yet done does not break the streak.
     *
     * @param sessionsByDate lookup of DailySession by "yyyy-MM-dd"
     */
    fun currentStreak(
        today: LocalDate,
        sessionsByDate: Map<String, DailySession>,
    ): Int {
        var streak = 0
        var date = today
        while (true) {
            val session = sessionsByDate[date.toString()]
            if (session != null && (session.isCompleted || session.usedFreeze)) {
                streak++
                date = date.minusDays(1)
            } else if (date == today) {
                // Today may still be pending — not a break yet.
                date = date.minusDays(1)
            } else {
                break
            }
        }
        return streak
    }

    /** ISO week label, e.g. "2026-W31", used to recharge one freeze per week. */
    fun isoWeek(date: LocalDate): String {
        val week = date.get(java.time.temporal.IsoFields.WEEK_OF_WEEK_BASED_YEAR)
        val weekYear = date.get(java.time.temporal.IsoFields.WEEK_BASED_YEAR)
        return "%d-W%02d".format(weekYear, week)
    }
}
