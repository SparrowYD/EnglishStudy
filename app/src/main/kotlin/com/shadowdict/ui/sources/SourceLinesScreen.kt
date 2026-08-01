package com.shadowdict.ui.sources

import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
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
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.shadowdict.core.subtitle.PlaybackTiming
import com.shadowdict.data.local.entity.Source
import com.shadowdict.data.local.entity.SourceType
import com.shadowdict.di.AppContainer
import com.shadowdict.media.SectionPlayer

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SourceLinesScreen(
    container: AppContainer,
    sourceId: Long,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val lines by container.repository.observeLines(sourceId)
        .collectAsStateWithLifecycle(initialValue = emptyList())
    var source by remember { mutableStateOf<Source?>(null) }

    LaunchedEffect(sourceId) {
        source = container.repository.getSource(sourceId)
    }

    val player = remember { SectionPlayer(context) }
    val isLocal = source?.type == SourceType.LOCAL_FILE
    LaunchedEffect(source) {
        val uri = source?.mediaUri
        if (isLocal && uri != null) {
            player.prepare(Uri.parse(uri))
        }
    }
    DisposableEffect(Unit) { onDispose { player.release() } }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(source?.title ?: "자료") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "뒤로")
                    }
                },
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(lines, key = { it.id }) { line ->
                Card(Modifier.fillMaxWidth()) {
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(line.textEn, style = MaterialTheme.typography.bodyLarge)
                            Text(
                                formatTime(line.startMs),
                                style = MaterialTheme.typography.bodyMedium,
                            )
                        }
                        if (isLocal) {
                            IconButton(onClick = {
                                player.playSection(
                                    PlaybackTiming.paddedStart(line.startMs),
                                    PlaybackTiming.paddedEnd(line.endMs),
                                )
                            }) {
                                Icon(Icons.Filled.PlayArrow, contentDescription = "재생")
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun formatTime(ms: Long): String {
    val totalSeconds = ms / 1000
    val m = totalSeconds / 60
    val s = totalSeconds % 60
    return "%02d:%02d".format(m, s)
}
