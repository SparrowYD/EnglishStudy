package com.shadowdict

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.shadowdict.ui.ShadowDictApp as ShadowDictAppUi
import com.shadowdict.ui.theme.ShadowDictTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val container = (application as ShadowDictApp).container
        setContent {
            ShadowDictTheme {
                ShadowDictAppUi(container = container)
            }
        }
    }
}
