package com.shadowdict.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.shadowdict.data.local.dao.AttemptDao
import com.shadowdict.data.local.dao.DailySessionDao
import com.shadowdict.data.local.dao.SourceDao
import com.shadowdict.data.local.dao.SubLineDao
import com.shadowdict.data.local.entity.Attempt
import com.shadowdict.data.local.entity.DailySession
import com.shadowdict.data.local.entity.Source
import com.shadowdict.data.local.entity.SubLine

@Database(
    entities = [Source::class, SubLine::class, DailySession::class, Attempt::class],
    version = 1,
    exportSchema = true,
)
@TypeConverters(Converters::class)
abstract class ShadowDictDatabase : RoomDatabase() {
    abstract fun sourceDao(): SourceDao
    abstract fun subLineDao(): SubLineDao
    abstract fun dailySessionDao(): DailySessionDao
    abstract fun attemptDao(): AttemptDao

    companion object {
        @Volatile
        private var instance: ShadowDictDatabase? = null

        fun get(context: Context): ShadowDictDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    ShadowDictDatabase::class.java,
                    "shadowdict.db",
                ).build().also { instance = it }
            }
    }
}
