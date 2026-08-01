package com.shadowdict.media

import android.content.Context
import android.net.Uri
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackParameters
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.SeekParameters
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Media3/ExoPlayer wrapper for precise section repeat (spec §11 #4).
 *
 * Uses [SeekParameters.EXACT] and polls the position every 50ms so a loop stops
 * tightly at [endMs]. Subtitles are never overlaid on the player surface — this
 * only owns audio/video playback; captions live in a separate card (spec §1).
 */
class SectionPlayer(context: Context) {

    val exoPlayer: ExoPlayer = ExoPlayer.Builder(context).build().apply {
        setSeekParameters(SeekParameters.EXACT)
    }

    private val scope = CoroutineScope(Dispatchers.Main)
    private var monitorJob: Job? = null

    fun prepare(uri: Uri) {
        exoPlayer.setMediaItem(MediaItem.fromUri(uri))
        exoPlayer.prepare()
    }

    fun setSpeed(speed: Float) {
        exoPlayer.playbackParameters = PlaybackParameters(speed)
    }

    /**
     * Play the [startMs, endMs] span once, then pause and invoke [onFinished].
     * A new call cancels any in-flight loop.
     */
    fun playSection(startMs: Long, endMs: Long, speed: Float = 1f, onFinished: () -> Unit = {}) {
        monitorJob?.cancel()
        setSpeed(speed)
        exoPlayer.seekTo(startMs.coerceAtLeast(0))
        exoPlayer.playWhenReady = true
        monitorJob = scope.launch {
            while (exoPlayer.currentPosition < endMs) {
                delay(50)
            }
            exoPlayer.playWhenReady = false
            onFinished()
        }
    }

    fun stop() {
        monitorJob?.cancel()
        exoPlayer.playWhenReady = false
    }

    fun release() {
        monitorJob?.cancel()
        exoPlayer.release()
    }
}
