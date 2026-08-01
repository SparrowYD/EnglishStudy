package com.shadowdict.ui.addsource

import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Checkbox
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.shadowdict.data.local.entity.SourceType
import com.shadowdict.ui.AppViewModelProvider

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AddSourceScreen(
    onDone: () -> Unit,
    viewModel: AddSourceViewModel = viewModel(factory = AppViewModelProvider.Factory),
) {
    val context = LocalContext.current
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(state.saved) { if (state.saved) onDone() }

    // Media picker (video/audio) with a persistable permission (spec §11 #3).
    val mediaPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument(),
    ) { uri: Uri? ->
        if (uri != null) {
            context.contentResolver.takePersistableUriPermission(
                uri, Intent.FLAG_GRANT_READ_URI_PERMISSION,
            )
            viewModel.setLocalMedia(uri.toString(), displayName(context, uri))
        }
    }

    val subtitlePicker = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument(),
    ) { uri: Uri? ->
        if (uri != null) {
            val content = context.contentResolver.openInputStream(uri)
                ?.bufferedReader()?.use { it.readText() } ?: ""
            viewModel.parseSubtitleContent(content, displayName(context, uri))
        }
    }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("자료 추가", style = MaterialTheme.typography.headlineLarge)

        Text("1. 타입 선택", style = MaterialTheme.typography.titleLarge)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TypeChip("로컬 파일", state.type == SourceType.LOCAL_FILE) {
                viewModel.setType(SourceType.LOCAL_FILE)
            }
            TypeChip("유튜브", state.type == SourceType.YOUTUBE) {
                viewModel.setType(SourceType.YOUTUBE)
            }
            TypeChip("텍스트", state.type == SourceType.TEXT_ONLY) {
                viewModel.setType(SourceType.TEXT_ONLY)
            }
        }

        OutlinedTextField(
            value = state.title,
            onValueChange = viewModel::setTitle,
            label = { Text("제목 (예: Friends S01E01)") },
            modifier = Modifier.fillMaxWidth(),
        )

        Text("2. 미디어", style = MaterialTheme.typography.titleLarge)
        when (state.type) {
            SourceType.LOCAL_FILE -> {
                OutlinedButton(
                    onClick = { mediaPicker.launch(arrayOf("video/*", "audio/*")) },
                    modifier = Modifier.fillMaxWidth(),
                ) { Text(state.mediaLabel ?: "영상/오디오 파일 선택") }
            }
            SourceType.YOUTUBE -> {
                OutlinedTextField(
                    value = state.mediaLabel ?: "",
                    onValueChange = viewModel::setYouTubeUrl,
                    label = { Text("유튜브 URL 붙여넣기") },
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            SourceType.TEXT_ONLY -> {
                Text("영상 없이 TTS로 학습합니다.", style = MaterialTheme.typography.bodyMedium)
            }
        }

        Text("3. 자막 / 텍스트", style = MaterialTheme.typography.titleLarge)
        if (state.type == SourceType.TEXT_ONLY) {
            var text by remember { mutableStateOf("") }
            OutlinedTextField(
                value = text,
                onValueChange = {
                    text = it
                    viewModel.parsePlainText(it)
                },
                label = { Text("영어 문장을 줄바꿈으로 붙여넣기") },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(160.dp),
            )
        } else {
            OutlinedButton(
                onClick = { subtitlePicker.launch(arrayOf("*/*")) },
                modifier = Modifier.fillMaxWidth(),
            ) { Text(state.subtitleFileName ?: ".srt / .vtt 자막 선택") }
        }

        // 4. Auto-generated flag (spec §2, §5.2)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Checkbox(checked = state.isAutoGenerated, onCheckedChange = viewModel::setAutoGenerated)
            Text("이 자막은 자동 생성 자막입니다 (받아쓰기 비활성화)")
        }

        state.previewError?.let {
            Text(it, color = MaterialTheme.colorScheme.error)
        }

        // 5. Preview first 5 lines
        if (state.parsedLines.isNotEmpty()) {
            Text("미리보기 (${state.parsedLines.size}문장)", style = MaterialTheme.typography.titleLarge)
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(12.dp)) {
                    state.parsedLines.take(5).forEach { line ->
                        Text(
                            "· ${line.text}",
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.padding(vertical = 2.dp),
                        )
                    }
                }
            }
        }

        Spacer(Modifier.height(8.dp))
        Button(
            onClick = { viewModel.save() },
            enabled = state.canSave,
            modifier = Modifier.fillMaxWidth(),
        ) { Text("저장") }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun TypeChip(label: String, selected: Boolean, onClick: () -> Unit) {
    FilterChip(selected = selected, onClick = onClick, label = { Text(label) })
}

private fun displayName(context: android.content.Context, uri: Uri): String {
    var name = uri.lastPathSegment ?: "file"
    context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
        val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        if (index >= 0 && cursor.moveToFirst()) {
            name = cursor.getString(index) ?: name
        }
    }
    return name
}
