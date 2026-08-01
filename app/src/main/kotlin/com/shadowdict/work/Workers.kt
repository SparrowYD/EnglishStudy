package com.shadowdict.work

import android.Manifest
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.shadowdict.R
import com.shadowdict.ShadowDictApp
import com.shadowdict.domain.StreakCalculator
import kotlinx.coroutines.flow.first
import java.time.LocalDate

private fun Context.app(): ShadowDictApp = applicationContext as ShadowDictApp

private fun Context.notify(id: Int, title: String, text: String) {
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU &&
        ActivityCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) !=
        PackageManager.PERMISSION_GRANTED
    ) return

    val notification = NotificationCompat.Builder(this, ShadowDictApp.CHANNEL_STREAK)
        .setSmallIcon(R.drawable.ic_launcher)
        .setContentTitle(title)
        .setContentText(text)
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        .setAutoCancel(true)
        .build()
    NotificationManagerCompat.from(this).notify(id, notification)
}

/** Fires at the user's reminder time; nudges if today's session is unfinished (spec §9). */
class DailyReminderWorker(context: Context, params: WorkerParameters) :
    CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val app = applicationContext.app()
        val today = LocalDate.now().toString()
        val session = app.container.repository.observeSession(today).first()
        if (session?.isCompleted != true) {
            val recent = app.container.repository.recentSessions(400).associateBy { it.date }
            val streak = StreakCalculator.currentStreak(LocalDate.now(), recent)
            applicationContext.notify(
                1,
                "🔥 ${streak}일 스트릭이 걸려 있어요",
                "오늘 10문장만 해볼까요?",
            )
        }
        // Self-reschedule for tomorrow.
        val settings = app.container.settingsRepository.settings.first()
        ReminderScheduler.scheduleDailyReminder(
            applicationContext, settings.reminderHour, settings.reminderMinute,
        )
        return Result.success()
    }
}

/** 22:30 last-call nudge (spec §9). */
class LastCallWorker(context: Context, params: WorkerParameters) :
    CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val app = applicationContext.app()
        val session = app.container.repository.observeSession(LocalDate.now().toString()).first()
        if (session?.isCompleted != true) {
            applicationContext.notify(2, "오늘 30분 남았습니다", "스트릭을 지켜요!")
        }
        ReminderScheduler.scheduleAll(applicationContext)
        return Result.success()
    }
}

/** 00:10 streak guard: consumes a freeze for yesterday if needed (spec §9). */
class StreakGuardWorker(context: Context, params: WorkerParameters) :
    CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val app = applicationContext.app()
        val repo = app.container.repository
        val settingsRepo = app.container.settingsRepository
        val yesterday = LocalDate.now().minusDays(1)
        val session = repo.observeSession(yesterday.toString()).first()

        if (session == null || (!session.isCompleted && !session.usedFreeze)) {
            val settings = settingsRepo.settings.first()
            // Recharge one freeze per ISO week.
            val week = StreakCalculator.isoWeek(LocalDate.now())
            var remaining = settings.freezeRemaining
            var rechargedWeek = settings.freezeRechargedWeek
            if (rechargedWeek != week) {
                remaining = maxOf(remaining, 1)
                rechargedWeek = week
            }
            if (remaining > 0) {
                repo.recordDayProgress(
                    date = yesterday,
                    newDone = 0,
                    reviewDone = 0,
                    goalCount = settings.dailyGoal,
                    studySeconds = 0,
                )
                repo.markFreezeUsed(yesterday.toString())
                settingsRepo.setFreeze(remaining - 1, rechargedWeek)
                applicationContext.notify(3, "❄️ 스트릭 프리즈 사용", "어제를 자동으로 지켰어요.")
            } else {
                settingsRepo.setFreeze(remaining, rechargedWeek)
            }
        }
        // Reschedule for the next midnight.
        ReminderScheduler.scheduleAll(applicationContext)
        return Result.success()
    }
}
