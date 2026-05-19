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
        val suspiciousPaths = listOf(
            "/system/xbin/su", "/system/bin/su", "/sbin/su", "/system/app/Superuser.apk",
            "/system/bin/failsafe/su", "/data/local/xbin/su", "/data/local/bin/su", "/data/local/su"
        )
        val testKeys = Build.TAGS?.contains("test-keys", ignoreCase = true) == true
        val suspiciousBinary = suspiciousPaths.any { File(it).exists() }
        val suspiciousBuildProps = Build.FINGERPRINT.contains("generic", ignoreCase = true) &&
            Build.TYPE.equals("userdebug", ignoreCase = true)

        return suspiciousBinary || testKeys || suspiciousBuildProps
    }
}

@Singleton
class BiometricGuard @Inject constructor(@ApplicationContext private val context: Context) {
    fun canAuthenticate(): Boolean {
        val biometricManager = BiometricManager.from(context)
        return biometricManager.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.DEVICE_CREDENTIAL
        ) == BiometricManager.BIOMETRIC_SUCCESS
    }

    fun availabilityMessage(): String = when (BiometricManager.from(context)
        .canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.DEVICE_CREDENTIAL)) {
        BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> "No biometrics or device credential enrolled"
        BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> "Biometric hardware unavailable"
        BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE -> "Biometric service unavailable"
        else -> "Biometrics available"
    }
}
