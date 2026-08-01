package com.shadowdict.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update
import com.shadowdict.data.local.entity.SubLine
import kotlinx.coroutines.flow.Flow

@Dao
interface SubLineDao {
    @Insert
    suspend fun insertAll(lines: List<SubLine>): List<Long>

    @Update
    suspend fun update(line: SubLine)

    @Query("SELECT * FROM lines WHERE id = :id")
    suspend fun getById(id: Long): SubLine?

    @Query("SELECT * FROM lines WHERE sourceId = :sourceId ORDER BY orderIndex ASC")
    fun observeBySource(sourceId: Long): Flow<List<SubLine>>

    @Query("SELECT * FROM lines WHERE sourceId = :sourceId ORDER BY orderIndex ASC")
    suspend fun getBySource(sourceId: Long): List<SubLine>

    /** New (never studied) lines, oldest source order first (spec §4 session build). */
    @Query(
        """
        SELECT * FROM lines
        WHERE status = 'NEW'
        ORDER BY sourceId ASC, orderIndex ASC
        LIMIT :limit
        """
    )
    suspend fun newQueue(limit: Int): List<SubLine>

    /** Review queue: due, not yet mastered (spec §8). */
    @Query(
        """
        SELECT * FROM lines
        WHERE nextReviewAt IS NOT NULL
          AND nextReviewAt <= :now
          AND status != 'MASTERED'
        ORDER BY nextReviewAt ASC
        LIMIT :limit
        """
    )
    suspend fun reviewQueue(now: Long, limit: Int): List<SubLine>

    @Query("SELECT COUNT(*) FROM lines WHERE status = 'MASTERED'")
    fun observeMasteredCount(): Flow<Int>

    @Query(
        "SELECT COUNT(*) FROM lines WHERE nextReviewAt IS NOT NULL AND nextReviewAt <= :now AND status != 'MASTERED'"
    )
    suspend fun dueReviewCount(now: Long): Int
}
