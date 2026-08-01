package com.shadowdict.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update
import com.shadowdict.data.local.entity.Source
import kotlinx.coroutines.flow.Flow

@Dao
interface SourceDao {
    @Insert
    suspend fun insert(source: Source): Long

    @Update
    suspend fun update(source: Source)

    @Query("DELETE FROM sources WHERE id = :id")
    suspend fun delete(id: Long)

    @Query("SELECT * FROM sources ORDER BY lastStudiedAt DESC, createdAt DESC")
    fun observeAll(): Flow<List<Source>>

    @Query("SELECT * FROM sources WHERE id = :id")
    suspend fun getById(id: Long): Source?

    @Query(
        "SELECT COUNT(*) FROM lines WHERE sourceId = :sourceId AND status = 'MASTERED'"
    )
    suspend fun masteredCount(sourceId: Long): Int
}
