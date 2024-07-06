package com.utnmobile.quetrucazo.ui.presentation

import androidx.compose.material3.ButtonColors
import androidx.compose.material3.ButtonDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

@Composable
fun colorBoton(): ButtonColors {
    return ButtonDefaults.buttonColors(containerColor = Color(0xFFA65E2E))
}

@Composable
fun volumeColor(): Color {
    return  Color.White
}

fun dialogColor(): Color {
    return Color(0xFF8a6642)
}

fun dialogColor2(): Color {
    return Color(0xFFA65E2E)
}

fun iconDialog(): Color {
    return Color.White
}

fun titleTopBarColor(): Color {
    return Color.White
}