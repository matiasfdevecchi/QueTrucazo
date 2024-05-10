package com.utnmobile.quetrucazo.ui.presentation

import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.*
import androidx.compose.ui.window.Dialog
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close

@Composable
fun VolumeControlDialog(onDismissRequest: () -> Unit) {
    // State for music and effects volume
    var musicVolume by remember { mutableStateOf(0.5f) }
    var effectsVolume by remember { mutableStateOf(0.5f) }

    Dialog(onDismissRequest = onDismissRequest) {
        Surface(
            shape = MaterialTheme.shapes.medium, // Adjust the shape as necessary
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    IconButton(onClick = onDismissRequest) {
                        Icon(Icons.Filled.Close, contentDescription = "Close")
                    }
                }
                Text("Música", style = MaterialTheme.typography.titleLarge)
                Slider(
                    value = musicVolume,
                    onValueChange = { musicVolume = it },
                    valueRange = 0f..1f,
                    modifier = Modifier.fillMaxWidth()
                )
                Text("Efectos", style = MaterialTheme.typography.titleLarge)
                Slider(
                    value = effectsVolume,
                    onValueChange = { effectsVolume = it },
                    valueRange = 0f..1f,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(20.dp))
            }
        }
    }
}