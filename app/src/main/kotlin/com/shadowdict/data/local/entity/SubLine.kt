package com.shadowdict.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

/** One subtitle line = one learning card (spec §3). */
@Entity(
    tableName = "lines",
    foreignKeys = [
        ForeignKey(
            entity = Source::class,
            parentColumns = ["id"],
            childColumns = ["sourceId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index("sourceId"), Index("nextReviewAt")],
)
data class SubLine(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sourceId: Long,
    val orderIndex: Int,
    val startMs: Long,
    val endMs: Long,
    val textEn: String,
    val textKo: String?,
    val chunkParentId: Long?,
    val wordCount: Int,

    // ── learning state ──
    val status: LineStatus = LineStatus.NEW,
    val firstTryAccuracy: Float? = null, // fixed on the first attempt; never overwrite
    val bestAccuracy: Float = 0f,
    val attemptCount: Int = 0,
    val replayCount: Int = 0,
    val hintLevelUsed: Int = 0,

    // ── spaced repetition ──
    val srsStage: Int = 0,
    val nextReviewAt: Long? = null,
    val completedAt: Long? = null,
)

enum class LineStatus { NEW, LEARNING, MASTERED }
