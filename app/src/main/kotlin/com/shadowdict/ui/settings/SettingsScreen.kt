package com.shadowdict.ui.settings

import android.content.Intent
import android.net.Uri
import android.provider.Settings as AndroidSettings
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.shadowdict.ui.AppViewModelProvider

@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel = viewModel(factory = AppViewModelProvider.Factory),
) {
    val context = LocalContext.current
    val settings by viewModel.settings.collectAsStateWithLifecycle()

    Column(
        Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("설정", style = MaterialTheme.typography.headlineLarge)

        SettingCard("알림 시각") {
            Stepper(
                label = "%02d:%02d".format(settings.reminderHour, settings.reminderMinute),
                onMinus = {
                    val h = (settings.reminderHour + 23) % 24
                    viewModel.setReminderTime(h, settings.reminderMinute)
                },
                onPlus = {
                    val h = (settings.reminderHour + 1) % 24
                    viewModel.setReminderTime(h, settings.reminderMinute)
                },
            )
        }

        SettingCard("하루 신규 목표") {
            Stepper(
                label = "${settings.dailyGoal}문장",
                onMinus = { viewModel.setDailyGoal((settings.dailyGoal - 1).coerceAtLeast(1)) },
                onPlus = { viewModel.setDailyGoal(settings.dailyGoal + 1) },
            )
        }

        SettingCard("하루 복습 목표") {
            Stepper(
                label = "${settings.reviewGoal}문장",
                onMinus = { viewModel.setReviewGoal((settings.reviewGoal - 1).coerceAtLeast(0)) },
                onPlus = { viewModel.setReviewGoal(settings.reviewGoal + 1) },
            )
        }

        SettingCard("청크 분할 임계값 (단어 수)") {
            Stepper(
                label = "${settings.chunkThreshold}단어",
                onMinus = { viewModel.setChunkThreshold((settings.chunkThreshold - 1).coerceAtLeast(4)) },
                onPlus = { viewModel.setChunkThreshold(settings.chunkThreshold + 1) },
            )
        }

        SettingCard("문장부호 엄격 모드") {
            Switch(
                checked = settings.strictPunctuation,
                onCheckedChange = viewModel::setStrictPunctuation,
            )
        }

        SettingCard("재생 속도") {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(0.5f, 0.75f, 1.0f).forEach { speed ->
                    OutlinedButton(onClick = { viewModel.setPlaybackSpeed(speed) }) {
                        Text("${speed}x")
                    }
                }
            }
        }

        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                Text("배터리 최적화 예외", style = MaterialTheme.typography.titleLarge)
                Text(
                    "삼성 갤럭시는 배터리 최적화로 알림이 누락될 수 있어요. 예외로 등록해 주세요.",
                    style = MaterialTheme.typography.bodyMedium,
                )
                Button(
                    onClick = {
                        val intent = Intent(
                            AndroidSettings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                            Uri.parse("package:${context.packageName}"),
                        )
                        runCatching { context.startActivity(intent) }
                    },
                    modifier = Modifier.padding(top = 8.dp),
                ) { Text("배터리 최적화 예외 요청") }
            }
        }
    }
}

@Composable
private fun SettingCard(title: String, content: @Composable () -> Unit) {
    Card(Modifier.fillMaxWidth()) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(title, style = MaterialTheme.typography.titleLarge)
            content()
        }
    }
}

@Composable
private fun Stepper(label: String, onMinus: () -> Unit, onPlus: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        OutlinedButton(onClick = onMinus) { Text("−") }
        Text(label, modifier = Modifier.padding(horizontal = 12.dp))
        OutlinedButton(onClick = onPlus) { Text("+") }
    }
}
