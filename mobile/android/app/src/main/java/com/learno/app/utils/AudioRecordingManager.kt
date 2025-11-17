package com.learno.app.utils

import android.content.Context
import android.media.MediaRecorder
import android.os.Build
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.io.File
import java.io.IOException

class AudioRecordingManager(private val context: Context) {
    private var mediaRecorder: MediaRecorder? = null
    private var currentRecordingFile: File? = null

    private val _isRecording = MutableStateFlow(false)
    val isRecording: StateFlow<Boolean> = _isRecording

    private val _recordingDuration = MutableStateFlow(0L)
    val recordingDuration: StateFlow<Long> = _recordingDuration

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage

    fun startRecording(): Boolean {
        return try {
            val outputFile = createAudioFile()
            currentRecordingFile = outputFile

            mediaRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(context)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }.apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioSamplingRate(16000)
                setAudioChannels(1)
                setAudioEncodingBitRate(128000)
                setOutputFile(outputFile.absolutePath)

                prepare()
                start()
            }

            _isRecording.value = true
            _recordingDuration.value = 0
            true
        } catch (e: IOException) {
            _errorMessage.value = "Failed to start recording: ${e.message}"
            false
        }
    }

    fun stopRecording(): File? {
        return try {
            mediaRecorder?.apply {
                stop()
                release()
            }
            mediaRecorder = null
            _isRecording.value = false

            currentRecordingFile
        } catch (e: Exception) {
            _errorMessage.value = "Failed to stop recording: ${e.message}"
            null
        }
    }

    fun cancelRecording() {
        try {
            mediaRecorder?.apply {
                stop()
                release()
            }
            mediaRecorder = null
            _isRecording.value = false

            currentRecordingFile?.delete()
            currentRecordingFile = null
        } catch (e: Exception) {
            _errorMessage.value = "Failed to cancel recording: ${e.message}"
        }
    }

    private fun createAudioFile(): File {
        val directory = File(context.cacheDir, "recordings")
        if (!directory.exists()) {
            directory.mkdirs()
        }

        val timestamp = System.currentTimeMillis()
        return File(directory, "recording_$timestamp.m4a")
    }

    fun release() {
        mediaRecorder?.release()
        mediaRecorder = null
    }
}
