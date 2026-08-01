package com.shadowdict.ui

import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.shadowdict.ShadowDictApp
import com.shadowdict.ui.addsource.AddSourceViewModel
import com.shadowdict.ui.home.HomeViewModel
import com.shadowdict.ui.settings.SettingsViewModel
import com.shadowdict.ui.stats.StatsViewModel
import com.shadowdict.ui.study.StudyViewModel

/** Factory that wires ViewModels from the [AppContainer] on the Application. */
object AppViewModelProvider {
    val Factory = viewModelFactory {
        initializer {
            val c = app().container
            HomeViewModel(c.repository, c.settingsRepository)
        }
        initializer {
            val c = app().container
            AddSourceViewModel(c.repository, c.settingsRepository)
        }
        initializer {
            val c = app().container
            StudyViewModel(c.repository, c.settingsRepository)
        }
        initializer {
            val c = app().container
            StatsViewModel(c.repository)
        }
        initializer {
            val c = app().container
            SettingsViewModel(c.settingsRepository)
        }
    }
}

private fun androidx.lifecycle.viewmodel.CreationExtras.app(): ShadowDictApp =
    this[APPLICATION_KEY] as ShadowDictApp
