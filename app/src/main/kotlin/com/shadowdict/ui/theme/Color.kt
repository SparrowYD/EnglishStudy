package com.shadowdict.ui.theme

import androidx.compose.ui.graphics.Color

// Brand
val Blue500 = Color(0xFF1E88E5)
val Blue200 = Color(0xFF90CAF9)
val Orange500 = Color(0xFFFB8C00)

// Scoring palette — light theme (spec §6.3)
object ScoringLight {
    val Correct = Color(0xFF2E7D32) // green
    val Typo = Color(0xFFEF6C00)    // orange
    val Wrong = Color(0xFFC62828)   // red
    val Extra = Color(0xFF9E9E9E)   // grey
    val Missing = Color(0xFF1565C0) // blue
}

// Scoring palette — dark theme (higher contrast, spec §11 #7)
object ScoringDark {
    val Correct = Color(0xFF81C784)
    val Typo = Color(0xFFFFB74D)
    val Wrong = Color(0xFFE57373)
    val Extra = Color(0xFFBDBDBD)
    val Missing = Color(0xFF64B5F6)
}
