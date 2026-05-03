package com.zwallet.core.security

import android.content.Context
import android.os.Build
import androidx.biometric.BiometricManager
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RootDetection @Inject constructor() {
    fun isDeviceCompromised(): Boolean {
        val suspiciousPaths = listOf("/system/xbin/su", "/system/bin/su", "/sbin/su")
        val testKeys = Build.TAGS?.contains("test-keys", ignoreCase = true) == true
        return suspiciousPaths.any { File(it).exists() } || testKeys
    }
}

@Singleton
class BiometricGuard @Inject constructor(@ApplicationContext private val context: Context) {
    fun canAuthenticate(): Boolean {
        val biometricManager = BiometricManager.from(context)
        return biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG) == BiometricManager.BIOMETRIC_SUCCESS
    }

    fun availabilityMessage(): String = when (BiometricManager.from(context)
        .canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)) {
        BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> "No biometrics enrolled"
        BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> "Biometric hardware unavailable"
        BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE -> "Biometric service unavailable"
        else -> "Biometrics available"
    }
}
