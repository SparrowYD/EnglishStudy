package com.shadowdict.ui.stats

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.shadowdict.ui.AppViewModelProvider
import com.shadowdict.ui.theme.ScoringTheme

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun StatsScreen(
    viewModel: StatsViewModel = viewModel(factory = AppViewModelProvider.Factory),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val done = ScoringTheme.colors.correct

    Column(
        Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("통계", style = MaterialTheme.typography.headlineLarge)

        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                Text("최근 30일", style = MaterialTheme.typography.titleLarge)
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier.padding(top = 12.dp),
                ) {
                    val map = state.recentSessions.associateBy { it.date }
                    // Render newest 30 cells; completed/freeze days are filled.
                    val cells = state.recentSessions.take(30)
                    if (cells.isEmpty()) {
                        Text("아직 학습 기록이 없어요.", style = MaterialTheme.typography.bodyMedium)
                    }
                    cells.forEach { session ->
                        val filled = session.isCompleted || session.usedFreeze
                        Box(
                            Modifier
                                .size(20.dp)
                                .clip(RoundedCornerShape(4.dp))
                                .background(if (filled) done else Color(0x22888888)),
                        )
                    }
                }
            }
        }

        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                Text("총 마스터 문장", style = MaterialTheme.typography.titleLarge)
                Text(
                    "${state.masteredCount}",
                    style = MaterialTheme.typography.headlineLarge,
                )
            }
        }

        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                Text("학습한 날", style = MaterialTheme.typography.titleLarge)
                Text(
                    "${state.totalStudyDays}일",
                    style = MaterialTheme.typography.headlineLarge,
                )
            }
        }
    }
}
