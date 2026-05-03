package com.zwallet.core.security

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class KeystoreManager(context: Context) {
    private val key = MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build()
    private val prefs = EncryptedSharedPreferences.create(
        context, "wallet_secure", key,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun saveMnemonic(mnemonic: String) = prefs.edit().putString("mnemonic", mnemonic).apply()
    fun loadMnemonic(): String? = prefs.getString("mnemonic", null)
    fun saveRefreshToken(token: String) = prefs.edit().putString("refresh_token", token).apply()
    fun loadRefreshToken(): String? = prefs.getString("refresh_token", null)
    fun clearSecrets() = prefs.edit().clear().apply()
}
