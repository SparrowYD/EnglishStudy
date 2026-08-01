package com.shadowdict.data.local.dao

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import com.shadowdict.data.local.entity.DailySession
import kotlinx.coroutines.flow.Flow

@Dao
interface DailySessionDao {
    @Upsert
    suspend fun upsert(session: DailySession)

    @Query("SELECT * FROM daily_sessions WHERE date = :date")
    suspend fun get(date: String): DailySession?

    @Query("SELECT * FROM daily_sessions WHERE date = :date")
    fun observe(date: String): Flow<DailySession?>

    /** Most recent sessions, newest first — used for streak + the stats calendar. */
    @Query("SELECT * FROM daily_sessions ORDER BY date DESC LIMIT :limit")
    suspend fun recent(limit: Int): List<DailySession>

    @Query("SELECT * FROM daily_sessions ORDER BY date DESC LIMIT :limit")
    fun observeRecent(limit: Int): Flow<List<DailySession>>
}
