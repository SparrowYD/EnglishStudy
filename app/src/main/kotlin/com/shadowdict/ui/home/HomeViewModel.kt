package com.shadowdict.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shadowdict.data.ShadowDictRepository
import com.shadowdict.data.local.entity.DailySession
import com.shadowdict.data.local.entity.Source
import com.shadowdict.data.settings.Settings
import com.shadowdict.data.settings.SettingsRepository
import com.shadowdict.domain.StreakCalculator
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import java.time.LocalDate

data class HomeUiState(
    val streak: Int = 0,
    val freezeRemaining: Int = 1,
    val reviewGoal: Int = 5,
    val dailyGoal: Int = 10,
    val reviewDone: Int = 0,
    val newDone: Int = 0,
    val todayCompleted: Boolean = false,
    val sources: List<Source> = emptyList(),
) {
    val totalGoal: Int get() = reviewGoal + dailyGoal
    val totalDone: Int get() = (reviewDone + newDone).coerceAtMost(totalGoal)
}

@OptIn(ExperimentalCoroutinesApi::class)
class HomeViewModel(
    repository: ShadowDictRepository,
    settingsRepository: SettingsRepository,
) : ViewModel() {

    private val today: LocalDate = LocalDate.now()

    val uiState: StateFlow<HomeUiState> = combine(
        repository.observeSources(),
        repository.observeRecentSessions(400),
        repository.observeSession(today.toString()),
        settingsRepository.settings,
    ) { sources, recent, todaySession, settings ->
        buildState(sources, recent, todaySession, settings)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), HomeUiState())

    private fun buildState(
        sources: List<Source>,
        recent: List<DailySession>,
        today: DailySession?,
        settings: Settings,
    ): HomeUiState {
        val byDate = recent.associateBy { it.date }
        val streak = StreakCalculator.currentStreak(this.today, byDate)
        return HomeUiState(
            streak = streak,
            freezeRemaining = settings.freezeRemaining,
            reviewGoal = settings.reviewGoal,
            dailyGoal = settings.dailyGoal,
            reviewDone = today?.reviewLinesDone ?: 0,
            newDone = today?.newLinesDone ?: 0,
            todayCompleted = today?.isCompleted ?: false,
            sources = sources,
        )
    }
}
