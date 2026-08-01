package com.shadowdict.ui.home

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.shadowdict.data.local.entity.Source
import com.shadowdict.ui.AppViewModelProvider

@Composable
fun HomeScreen(
    onStartStudy: () -> Unit,
    onAddSource: () -> Unit,
    onOpenSource: (Long) -> Unit,
    viewModel: HomeViewModel = viewModel(factory = AppViewModelProvider.Factory),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    LazyColumn(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(20.dp)) {
                    Text(
                        text = "🔥 ${state.streak}일 연속",
                        style = MaterialTheme.typography.headlineLarge,
                        fontWeight = FontWeight.Bold,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text("❄️ 프리즈 ${state.freezeRemaining}개")
                }
            }
        }

        item {
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(20.dp)) {
                    Text("오늘의 학습", style = MaterialTheme.typography.titleLarge)
                    Spacer(Modifier.height(8.dp))
                    Text("복습 ${state.reviewGoal} · 신규 ${state.dailyGoal}")
                    Spacer(Modifier.height(8.dp))
                    val progress = if (state.totalGoal == 0) 0f
                        else state.totalDone.toFloat() / state.totalGoal
                    LinearProgressIndicator(
                        progress = { progress },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(4.dp))
                    Text("${state.totalDone}/${state.totalGoal}")
                    Spacer(Modifier.height(16.dp))
                    Button(onClick = onStartStudy, modifier = Modifier.fillMaxWidth()) {
                        Text(if (state.todayCompleted) "오늘 완료 ✓ · 더 학습" else "학습 시작")
                    }
                }
            }
        }

        item {
            Text("내 자료", style = MaterialTheme.typography.titleLarge)
        }

        items(state.sources, key = { it.id }) { source ->
            SourceRow(source = source, onClick = { onOpenSource(source.id) })
        }

        item {
            OutlinedButton(onClick = onAddSource, modifier = Modifier.fillMaxWidth()) {
                Text("+ 자료 추가")
            }
        }
    }
}

@Composable
private fun SourceRow(source: Source, onClick: () -> Unit) {
    Card(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(source.title, style = MaterialTheme.typography.bodyLarge)
            Text("${source.totalLines}문장")
        }
    }
}
