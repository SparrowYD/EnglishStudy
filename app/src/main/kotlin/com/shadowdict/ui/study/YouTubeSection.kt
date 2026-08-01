package com.shadowdict.ui.study

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.YouTubePlayer
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.listeners.AbstractYouTubePlayerListener
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.listeners.YouTubePlayerTracker
import com.pierfrancescosoffritti.androidyoutubeplayer.core.player.views.YouTubePlayerView

/**
 * Imperative handle the study screen uses to drive section repeat on the
 * YouTube embed player. Subtitles are never overlaid on the player itself
 * (spec §1) — they live in the stage cards below it.
 */
class YouTubeController {
    var player: YouTubePlayer? = null
    val tracker = YouTubePlayerTracker()
    var currentVideoId: String? = null
}

/**
 * Hosts the YouTube IFrame player (via the androidyoutubeplayer WebView wrapper,
 * the Google-recommended replacement for the deprecated native API, spec §1).
 */
@Composable
fun YouTubeSection(
    videoId: String,
    controller: YouTubeController,
    modifier: Modifier = Modifier,
) {
    val lifecycleOwner = LocalLifecycleOwner.current
    AndroidView(
        modifier = modifier,
        factory = { ctx ->
            YouTubePlayerView(ctx).also { view ->
                lifecycleOwner.lifecycle.addObserver(view)
                view.addYouTubePlayerListener(object : AbstractYouTubePlayerListener() {
                    override fun onReady(youTubePlayer: YouTubePlayer) {
                        controller.player = youTubePlayer
                        youTubePlayer.addListener(controller.tracker)
                        youTubePlayer.cueVideo(videoId, 0f)
                        controller.currentVideoId = videoId
                    }
                })
            }
        },
    )
}
