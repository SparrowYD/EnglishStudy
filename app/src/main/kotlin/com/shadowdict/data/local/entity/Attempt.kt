package com.shadowdict.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/** A single dictation attempt, kept for analytics and review (spec §3). */
@Entity(tableName = "attempts")
data class Attempt(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val lineId: Long,
    val userInput: String,
    val accuracy: Float,
    val hintLevel: Int,
    val createdAt: Long,
)
