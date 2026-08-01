package com.shadowdict.data.settings

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

/** All user settings from spec §3 (DataStore). */
data class Settings(
    val reminderHour: Int = 21,
    val reminderMinute: Int = 0,
    val dailyGoal: Int = 10,
    val reviewGoal: Int = 5,
    val freezeRemaining: Int = 1,
    val freezeRechargedWeek: String = "",
    val strictPunctuation: Boolean = false,
    val chunkThreshold: Int = 12,
    val playbackSpeed: Float = 1.0f,
)

class SettingsRepository(private val context: Context) {

    val settings: Flow<Settings> = context.dataStore.data.map { p ->
        Settings(
            reminderHour = p[Keys.REMINDER_HOUR] ?: 21,
            reminderMinute = p[Keys.REMINDER_MINUTE] ?: 0,
            dailyGoal = p[Keys.DAILY_GOAL] ?: 10,
            reviewGoal = p[Keys.REVIEW_GOAL] ?: 5,
            freezeRemaining = p[Keys.FREEZE_REMAINING] ?: 1,
            freezeRechargedWeek = p[Keys.FREEZE_WEEK] ?: "",
            strictPunctuation = p[Keys.STRICT_PUNCTUATION] ?: false,
            chunkThreshold = p[Keys.CHUNK_THRESHOLD] ?: 12,
            playbackSpeed = p[Keys.PLAYBACK_SPEED] ?: 1.0f,
        )
    }

    suspend fun setReminderTime(hour: Int, minute: Int) = context.dataStore.edit {
        it[Keys.REMINDER_HOUR] = hour
        it[Keys.REMINDER_MINUTE] = minute
    }

    suspend fun setDailyGoal(value: Int) = context.dataStore.edit { it[Keys.DAILY_GOAL] = value }
    suspend fun setReviewGoal(value: Int) = context.dataStore.edit { it[Keys.REVIEW_GOAL] = value }
    suspend fun setStrictPunctuation(value: Boolean) =
        context.dataStore.edit { it[Keys.STRICT_PUNCTUATION] = value }

    suspend fun setChunkThreshold(value: Int) =
        context.dataStore.edit { it[Keys.CHUNK_THRESHOLD] = value }

    suspend fun setPlaybackSpeed(value: Float) =
        context.dataStore.edit { it[Keys.PLAYBACK_SPEED] = value }

    suspend fun setFreeze(remaining: Int, week: String) = context.dataStore.edit {
        it[Keys.FREEZE_REMAINING] = remaining
        it[Keys.FREEZE_WEEK] = week
    }

    private object Keys {
        val REMINDER_HOUR = intPreferencesKey("reminderHour")
        val REMINDER_MINUTE = intPreferencesKey("reminderMinute")
        val DAILY_GOAL = intPreferencesKey("dailyGoal")
        val REVIEW_GOAL = intPreferencesKey("reviewGoal")
        val FREEZE_REMAINING = intPreferencesKey("freezeRemaining")
        val FREEZE_WEEK = stringPreferencesKey("freezeRechargedWeek")
        val STRICT_PUNCTUATION = booleanPreferencesKey("strictPunctuation")
        val CHUNK_THRESHOLD = intPreferencesKey("chunkThreshold")
        val PLAYBACK_SPEED = floatPreferencesKey("playbackSpeed")
    }
}
