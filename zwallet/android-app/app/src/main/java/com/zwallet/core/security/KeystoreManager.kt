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

    fun saveEncryptedSecret(secret: String) = prefs.edit().putString("wallet_secret", secret).apply()
    fun loadEncryptedSecret(): String? = prefs.getString("wallet_secret", null)
    fun clearSecrets() = prefs.edit().clear().apply()
}
