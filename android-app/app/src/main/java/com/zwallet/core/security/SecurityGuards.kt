package com.zwallet.core.security

import android.content.Context
import android.os.Build
import java.io.File

class RootDetection {
    fun isDeviceCompromised(): Boolean {
        val suspiciousPaths = listOf("/system/xbin/su", "/system/bin/su", "/sbin/su")
        return suspiciousPaths.any { File(it).exists() }
    }
}

class AntiTamperDetection {
    fun isDebuggable(context: Context): Boolean = (context.applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0
    fun isEmulator(): Boolean = Build.FINGERPRINT.contains("generic", ignoreCase = true)
}
