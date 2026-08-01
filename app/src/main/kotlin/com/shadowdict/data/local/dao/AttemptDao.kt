package com.shadowdict.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import com.shadowdict.data.local.entity.Attempt

@Dao
interface AttemptDao {
    @Insert
    suspend fun insert(attempt: Attempt): Long

    @Query("SELECT userInput FROM attempts ORDER BY createdAt DESC LIMIT :limit")
    suspend fun recentInputs(limit: Int): List<String>

    @Query("SELECT * FROM attempts WHERE lineId = :lineId ORDER BY createdAt ASC")
    suspend fun forLine(lineId: Long): List<Attempt>
}
