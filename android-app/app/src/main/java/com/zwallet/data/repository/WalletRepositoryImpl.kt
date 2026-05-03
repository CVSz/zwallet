package com.zwallet.data.repository

import com.zwallet.core.security.KeystoreManager
import com.zwallet.domain.model.*
import com.zwallet.domain.repository.WalletRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton
import android.content.Context

@Singleton
class WalletRepositoryImpl @Inject constructor(@ApplicationContext context: Context) : WalletRepository {
    private val keystore = KeystoreManager(context)
    private val tokenState = MutableStateFlow(listOf(TokenBalance("ETH", 1.2, 3050.0), TokenBalance("BTC", 0.14, 62000.0)))
    private val txState = MutableStateFlow(listOf(Transaction("0xabc", "Ethereum", 0.32, "2026-05-02T12:00:00Z", "CONFIRMED")))

    override suspend fun createWallet(): Wallet {
        val generatedRecovery = "generated-${UUID.randomUUID()}"
        keystore.saveEncryptedSecret(generatedRecovery)
        return Wallet(UUID.randomUUID().toString(), "0x${UUID.randomUUID()}", "Saved in secure enclave")
    }

    override suspend fun importWallet(mnemonic: String): Wallet {
        val normalized = mnemonic.trim().split("\\s+".toRegex()).joinToString(" ")
        require(normalized.split(" ").size >= 12) { "Recovery phrase must include at least 12 words" }
        keystore.saveEncryptedSecret(normalized)
        return Wallet(UUID.randomUUID().toString(), "0x${normalized.hashCode()}", "Imported and encrypted")
    }

    override fun portfolio(): Flow<List<TokenBalance>> = tokenState.asStateFlow()
    override fun transactions(): Flow<List<Transaction>> = txState.asStateFlow()
    override fun tokens(): Flow<List<TokenBalance>> = tokenState.asStateFlow()

    override suspend fun send(to: String, token: String, amount: Double): String {
        require(to.startsWith("0x") && to.length >= 10) { "Invalid recipient address" }
        require(amount > 0) { "Amount must be greater than zero" }
        return "tx_${to.take(6)}_$token_$amount"
    }

    override suspend fun quoteSwap(from: String, to: String, amount: Double): SwapQuote {
        require(from != to) { "Swap pair must be different assets" }
        require(amount > 0) { "Amount must be greater than zero" }
        return SwapQuote(from, to, 0.94)
    }
}
