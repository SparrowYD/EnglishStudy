package com.shadowdict.ui.study

import android.net.Uri
import android.speech.tts.TextToSpeech
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.shadowdict.data.local.entity.SourceType
import com.shadowdict.di.AppContainer
import com.shadowdict.domain.Stage
import com.shadowdict.media.SectionPlayer
import com.shadowdict.ui.AppViewModelProvider
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudyScreen(
    container: AppContainer,
    onExit: () -> Unit,
    viewModel: StudyViewModel = viewModel(factory = AppViewModelProvider.Factory),
) {
    val context = LocalContext.current
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) { viewModel.start() }

    // Playback: local files use ExoPlayer; text-only/YouTube fall back to TTS.
    val player = remember { SectionPlayer(context) }
    var tts by remember { mutableStateOf<TextToSpeech?>(null) }
    LaunchedEffect(Unit) {
        tts = TextToSpeech(context) { status ->
            if (status == TextToSpeech.SUCCESS) tts?.language = Locale.US
        }
    }
    DisposableEffect(Unit) {
        onDispose {
            player.release()
            tts?.shutdown()
        }
    }

    val isLocal = state.sourceType == SourceType.LOCAL_FILE
    LaunchedEffect(state.mediaUri, isLocal) {
        val uri = state.mediaUri
        if (isLocal && uri != null) player.prepare(Uri.parse(uri))
    }

    val isYouTube = state.sourceType == SourceType.YOUTUBE
    val ytController = remember { YouTubeController() }

    // React to play requests emitted by the ViewModel.
    LaunchedEffect(state.playRequest) {
        if (state.playRequest == 0) return@LaunchedEffect
        val line = state.line ?: return@LaunchedEffect
        val ytPlayer = ytController.player
        when {
            isLocal && state.mediaUri != null ->
                player.playSection(state.playStartMs, state.playEndMs, state.playSpeed)

            isYouTube && ytPlayer != null && state.mediaUri != null -> {
                val startSec = state.playStartMs / 1000f
                if (ytController.currentVideoId != state.mediaUri) {
                    ytPlayer.cueVideo(state.mediaUri!!, startSec)
                    ytController.currentVideoId = state.mediaUri
                }
                ytPlayer.seekTo(startSec)
                ytPlayer.play()
                // Poll the tracker and pause the loop at the line's end (spec §4).
                while (ytController.tracker.currentSecond * 1000 < state.playEndMs) {
                    delay(100)
                }
                ytPlayer.pause()
            }

            else -> tts?.speak(line.textEn, TextToSpeech.QUEUE_FLUSH, null, "line-${line.id}")
        }
    }

    when {
        state.loading -> LoadingBox()
        state.finished -> FinishedBox(onExit)
        else -> Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("진행도 ${state.progressIndex}/${state.total}") },
                    navigationIcon = {
                        IconButton(onClick = onExit) {
                            Icon(Icons.Filled.Close, contentDescription = "나가기")
                        }
                    },
                    actions = { StageIndicator(state) },
                )
            },
        ) { padding ->
            Column(
                Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 20.dp)
                    .imePadding(),
            ) {
                LinearProgressIndicator(
                    progress = { state.progressIndex.toFloat() / state.total.coerceAtLeast(1) },
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(16.dp))
                // YouTube sources render the embed player (kept mounted so it can
                // initialize); local/text sources have no on-screen video.
                if (isYouTube && state.mediaUri != null) {
                    YouTubeSection(
                        videoId = state.mediaUri!!,
                        controller = ytController,
                        modifier = Modifier
                            .fillMaxWidth()
                            .aspectRatio(16f / 9f),
                    )
                    Spacer(Modifier.height(16.dp))
                }
                when (state.stage) {
                    Stage.LISTEN -> ListenStage(state, viewModel)
                    Stage.MEANING -> MeaningStage(state, viewModel)
                    Stage.DICTATION -> DictationStage(state, viewModel)
                    Stage.IMPRINT -> ImprintStage(state, viewModel)
                    null -> Unit
                }
            }
        }
    }
}

@Composable
private fun StageIndicator(state: StudyUiState) {
    val symbols = listOf("①", "②", "③", "④")
    Row(Modifier.padding(end = 8.dp)) {
        state.stages.forEachIndexed { i, stage ->
            val active = stage == state.stage
            // Map the visible index to a circled number based on stage identity.
            val label = when (stage) {
                Stage.LISTEN -> symbols[0]
                Stage.MEANING -> symbols[1]
                Stage.DICTATION -> symbols[2]
                Stage.IMPRINT -> symbols[3]
            }
            Text(
                text = label,
                color = if (active) MaterialTheme.colorScheme.primary
                else MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 2.dp),
            )
        }
    }
}

@Composable
private fun LoadingBox() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}

@Composable
private fun FinishedBox(onExit: () -> Unit) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("오늘 학습 완료 🎉", style = MaterialTheme.typography.headlineLarge)
            Spacer(Modifier.height(16.dp))
            Button(onClick = onExit) { Text("홈으로") }
        }
    }
}

// ── Stage 1: LISTEN ──
@Composable
private fun ListenStage(state: StudyUiState, vm: StudyViewModel) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        Text("소리에 집중해 들어보세요", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(32.dp))
        Row {
            repeat(state.listenRequired) { i ->
                Text(
                    if (i < state.listenReplays) "●" else "○",
                    style = MaterialTheme.typography.headlineLarge,
                    modifier = Modifier.padding(horizontal = 6.dp),
                )
            }
        }
        Spacer(Modifier.height(32.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            FilledTonalButton(onClick = { vm.onReplay() }) {
                Icon(Icons.Filled.PlayArrow, contentDescription = null)
                Text("다시 듣기")
            }
        }
        Spacer(Modifier.height(24.dp))
        Button(
            onClick = { vm.advanceStage() },
            enabled = state.listenSatisfied,
            modifier = Modifier.fillMaxWidth(),
        ) { Text("다음") }
    }
}

// ── Stage 2: MEANING ──
@Composable
private fun MeaningStage(state: StudyUiState, vm: StudyViewModel) {
    Column(Modifier.fillMaxWidth()) {
        Text(
            "\"${state.line?.textEn ?: ""}\"",
            style = MaterialTheme.typography.titleLarge,
        )
        Spacer(Modifier.height(24.dp))
        OutlinedTextField(
            value = state.meaningInput,
            onValueChange = vm::onMeaningChange,
            label = { Text("한글 뜻을 써보세요") },
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(16.dp))
        Button(onClick = { vm.confirmMeaning() }, modifier = Modifier.fillMaxWidth()) {
            Text("확인")
        }
    }
}

// ── Stage 3: DICTATION ──
@Composable
private fun DictationStage(state: StudyUiState, vm: StudyViewModel) {
    Column(Modifier.fillMaxWidth()) {
        Text("🔊 소리만 듣고 영어로 입력", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(16.dp))

        state.hintText?.let { hint ->
            Surface(color = MaterialTheme.colorScheme.secondaryContainer) {
                Text(
                    hint,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    textAlign = TextAlign.Center,
                )
            }
            Spacer(Modifier.height(12.dp))
        }
        if (state.revealAnswer) {
            Text(
                state.line?.textEn ?: "",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.primary,
            )
            Spacer(Modifier.height(12.dp))
        }

        OutlinedTextField(
            value = state.dictationInput,
            onValueChange = vm::onDictationChange,
            label = { Text("들은 대로 영어로 입력") },
            enabled = !state.dictationPassed,
            // Spec §11 #1: kill keyboard auto-correct/suggestions or the app is pointless.
            keyboardOptions = KeyboardOptions(
                autoCorrectEnabled = false,
                keyboardType = KeyboardType.Ascii,
                capitalization = KeyboardCapitalization.None,
                imeAction = ImeAction.Done,
            ),
            keyboardActions = KeyboardActions(onDone = { vm.submitDictation() }),
            modifier = Modifier.fillMaxWidth(),
        )

        Spacer(Modifier.height(16.dp))
        state.scoreResult?.let { result ->
            ScoreFeedback(result)
            Spacer(Modifier.height(8.dp))
            Text(
                "정확도 ${result.correctCount}/${result.tokens.count { it.type != com.shadowdict.core.scoring.TokenType.EXTRA }} (${result.accuracyPercent}%) · 시도 ${state.attemptNumber}회",
                style = MaterialTheme.typography.bodyMedium,
            )
        }

        Spacer(Modifier.height(16.dp))
        // Fixed action bar just above the keyboard (spec §5.3, §11 #2).
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            OutlinedButton(onClick = { vm.requestPlay() }) { Text("다시 듣기") }
            if (!state.dictationPassed) {
                TextButton(onClick = { vm.useHint() }) { Text("힌트") }
            }
            Spacer(Modifier.weight(1f))
            if (state.dictationPassed) {
                Button(onClick = { vm.advanceStage() }) { Text("통과 ✓ 다음") }
            } else if (state.scoreResult != null) {
                Button(onClick = { vm.retryDictation() }) { Text("다시 시도") }
            } else {
                Button(onClick = { vm.submitDictation() }) { Text("제출") }
            }
        }
    }
}

// ── Stage 4: IMPRINT ──
@Composable
private fun ImprintStage(state: StudyUiState, vm: StudyViewModel) {
    Column(Modifier.fillMaxWidth()) {
        Text(state.fullSentence, style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(12.dp))
        state.line?.textKo?.let { Text(it, style = MaterialTheme.typography.bodyLarge) }
        Spacer(Modifier.height(24.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            FilledTonalButton(onClick = { vm.requestPlay() }) {
                Icon(Icons.Filled.PlayArrow, contentDescription = null)
                Text("듣기")
            }
        }
        Spacer(Modifier.height(24.dp))
        Button(onClick = { vm.advanceStage() }, modifier = Modifier.fillMaxWidth()) {
            Text("다음 문장 →")
        }
    }
}
