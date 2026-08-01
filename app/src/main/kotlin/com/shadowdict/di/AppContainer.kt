package com.shadowdict.di

import android.content.Context
import com.shadowdict.data.ShadowDictRepository
import com.shadowdict.data.local.ShadowDictDatabase
import com.shadowdict.data.settings.SettingsRepository

/** Minimal manual dependency container (no DI framework needed for one user). */
class AppContainer(context: Context) {
    private val database = ShadowDictDatabase.get(context)
    val repository = ShadowDictRepository(database)
    val settingsRepository = SettingsRepository(context.applicationContext)
}
