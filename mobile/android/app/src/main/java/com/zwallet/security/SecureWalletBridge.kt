package com.zwallet.security

import java.nio.charset.StandardCharsets
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

interface BiometricUnlockProvider {
    fun isSupported(): Boolean
    fun authenticate(reason: String): Boolean
}

data class AndroidEncryptedPayload(
    val alias: String,
    val iv: ByteArray,
    val cipherText: ByteArray
)

class SecureWalletBridge(
    private val keyStore: KeyStore,
    private val biometricUnlockProvider: BiometricUnlockProvider?
) {
    fun encrypt(alias: String, plaintext: ByteArray): AndroidEncryptedPayload {
        val key = requireKey(alias)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key)
        val cipherText = cipher.doFinal(plaintext)
        wipe(plaintext)
        return AndroidEncryptedPayload(alias = alias, iv = cipher.iv, cipherText = cipherText)
    }

    fun decrypt(payload: AndroidEncryptedPayload, reason: String = "Unlock wallet key"): ByteArray {
        biometricUnlockProvider?.let {
            if (it.isSupported() && !it.authenticate(reason)) {
                throw SecurityException("Biometric authorization failed")
            }
        }

        val key = requireKey(payload.alias)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(128, payload.iv))
        return cipher.doFinal(payload.cipherText)
    }

    fun signOpaque(alias: String, payload: ByteArray): ByteArray {
        val unlocked = decrypt(encrypt(alias, payload.copyOf()))
        val digest = java.security.MessageDigest.getInstance("SHA-256").digest(unlocked)
        wipe(unlocked)
        return digest
    }

    private fun requireKey(alias: String): SecretKey {
        val key = keyStore.getKey(alias, null)
            ?: throw IllegalStateException("Missing key alias=$alias")
        return key as SecretKey
    }

    private fun wipe(bytes: ByteArray) {
        bytes.fill(0)
    }

    companion object {
        fun normalizeSecret(secret: String): ByteArray =
            secret.toByteArray(StandardCharsets.UTF_8)
    }
}
