package com.shadowdict.ui.sources

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.shadowdict.ui.AppViewModelProvider
import com.shadowdict.ui.home.HomeViewModel

@Composable
fun SourcesScreen(
    onAddSource: () -> Unit,
    onOpenSource: (Long) -> Unit,
    viewModel: HomeViewModel = viewModel(factory = AppViewModelProvider.Factory),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    LazyColumn(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { Text("내 자료", style = MaterialTheme.typography.titleLarge) }

        items(state.sources, key = { it.id }) { source ->
            Card(
                Modifier
                    .fillMaxWidth()
                    .clickable { onOpenSource(source.id) },
            ) {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column {
                        Text(source.title, style = MaterialTheme.typography.bodyLarge)
                        Text(
                            source.type.name,
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                    Text("${source.totalLines}문장")
                }
            }
        }

        item {
            OutlinedButton(onClick = onAddSource, modifier = Modifier.fillMaxWidth()) {
                Text("+ 자료 추가")
            }
        }
    }
}
