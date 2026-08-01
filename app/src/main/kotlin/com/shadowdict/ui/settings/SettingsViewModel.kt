package com.shadowdict.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shadowdict.data.settings.Settings
import com.shadowdict.data.settings.SettingsRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class SettingsViewModel(
    private val settingsRepository: SettingsRepository,
) : ViewModel() {

    val settings: StateFlow<Settings> =
        settingsRepository.settings.stateIn(
            viewModelScope, SharingStarted.WhileSubscribed(5_000), Settings(),
        )

    fun setReminderTime(hour: Int, minute: Int) =
        viewModelScope.launch { settingsRepository.setReminderTime(hour, minute) }

    fun setDailyGoal(value: Int) =
        viewModelScope.launch { settingsRepository.setDailyGoal(value) }

    fun setReviewGoal(value: Int) =
        viewModelScope.launch { settingsRepository.setReviewGoal(value) }

    fun setChunkThreshold(value: Int) =
        viewModelScope.launch { settingsRepository.setChunkThreshold(value) }

    fun setStrictPunctuation(value: Boolean) =
        viewModelScope.launch { settingsRepository.setStrictPunctuation(value) }

    fun setPlaybackSpeed(value: Float) =
        viewModelScope.launch { settingsRepository.setPlaybackSpeed(value) }
}
