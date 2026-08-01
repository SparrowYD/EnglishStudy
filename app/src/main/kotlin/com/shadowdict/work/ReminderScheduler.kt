package com.shadowdict.work

import android.content.Context
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.shadowdict.data.settings.SettingsRepository
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import java.time.LocalDateTime
import java.time.ZoneId
import java.util.concurrent.TimeUnit

/**
 * Self-rescheduling reminder workers (spec §9).
 *
 * PeriodicWorkRequest cannot hit an exact time, so each worker re-enqueues a
 * OneTimeWorkRequest for its next slot. Exact alarms are intentionally avoided
 * (spec §1); WorkManager's flexible scheduling (±15 min) is accepted.
 */
object ReminderScheduler {

    const val DAILY_REMINDER = "daily_reminder"
    const val LAST_CALL = "last_call"
    const val STREAK_GUARD = "streak_guard"

    fun scheduleAll(context: Context) {
        val settings = runBlocking { SettingsRepository(context).settings.first() }
        scheduleDailyReminder(context, settings.reminderHour, settings.reminderMinute)
        scheduleAt(context, LAST_CALL, 22, 30, LastCallWorker::class.java)
        scheduleAt(context, STREAK_GUARD, 0, 10, StreakGuardWorker::class.java)
    }

    fun scheduleDailyReminder(context: Context, hour: Int, minute: Int) {
        scheduleAt(context, DAILY_REMINDER, hour, minute, DailyReminderWorker::class.java)
    }

    private fun <W : androidx.work.ListenableWorker> scheduleAt(
        context: Context,
        name: String,
        hour: Int,
        minute: Int,
        worker: Class<W>,
    ) {
        val delay = millisUntilNext(hour, minute)
        val request = androidx.work.OneTimeWorkRequest.Builder(worker)
            .setInitialDelay(delay, TimeUnit.MILLISECONDS)
            .build()
        WorkManager.getInstance(context)
            .enqueueUniqueWork(name, ExistingWorkPolicy.REPLACE, request)
    }

    fun millisUntilNext(hour: Int, minute: Int, zone: ZoneId = ZoneId.systemDefault()): Long {
        val now = LocalDateTime.now(zone)
        var next = now.withHour(hour).withMinute(minute).withSecond(0).withNano(0)
        if (!next.isAfter(now)) next = next.plusDays(1)
        val nowMs = now.atZone(zone).toInstant().toEpochMilli()
        val nextMs = next.atZone(zone).toInstant().toEpochMilli()
        return (nextMs - nowMs).coerceAtLeast(0)
    }
}
