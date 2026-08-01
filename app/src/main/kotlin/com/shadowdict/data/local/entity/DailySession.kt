package com.shadowdict.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/** Per-day session record; the basis for streak calculation (spec §3, §9). */
@Entity(tableName = "daily_sessions")
data class DailySession(
    @PrimaryKey val date: String, // "2026-08-01" (LocalDate, device timezone)
    val newLinesDone: Int = 0,
    val reviewLinesDone: Int = 0,
    val goalCount: Int = 10,
    val isCompleted: Boolean = false,
    val usedFreeze: Boolean = false,
    val studySeconds: Int = 0,
    val completedAt: Long? = null,
)
