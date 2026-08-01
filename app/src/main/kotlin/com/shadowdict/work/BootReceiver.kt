package com.shadowdict.work

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Re-arms the self-rescheduling workers after a reboot (spec §9). */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            ReminderScheduler.scheduleAll(context.applicationContext)
        }
    }
}
