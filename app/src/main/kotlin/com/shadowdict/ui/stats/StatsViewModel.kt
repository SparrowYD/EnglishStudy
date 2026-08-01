package com.shadowdict.ui.stats

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shadowdict.data.ShadowDictRepository
import com.shadowdict.data.local.entity.DailySession
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn

data class StatsUiState(
    val recentSessions: List<DailySession> = emptyList(),
    val masteredCount: Int = 0,
    val totalStudyDays: Int = 0,
)

class StatsViewModel(
    repository: ShadowDictRepository,
) : ViewModel() {

    val uiState: StateFlow<StatsUiState> =
        combine2(
            repository.observeRecentSessions(30),
            repository.observeMasteredCount(),
        ).map { (sessions, mastered) ->
            StatsUiState(
                recentSessions = sessions,
                masteredCount = mastered,
                totalStudyDays = sessions.count { it.isCompleted || it.usedFreeze },
            )
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), StatsUiState())
}

// Small local combine helper to keep imports tidy.
private fun combine2(
    a: kotlinx.coroutines.flow.Flow<List<DailySession>>,
    b: kotlinx.coroutines.flow.Flow<Int>,
) = kotlinx.coroutines.flow.combine(a, b) { x, y -> x to y }
