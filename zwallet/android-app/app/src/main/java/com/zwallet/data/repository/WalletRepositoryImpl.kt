package com.zwallet.data.repository

import android.content.Context
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types
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

@Singleton
class WalletRepositoryImpl @Inject constructor(@ApplicationContext context: Context) : WalletRepository {
    private val keystore = KeystoreManager(context)
    private val cachePrefs = context.getSharedPreferences("wallet_cache", Context.MODE_PRIVATE)
    private val moshi = Moshi.Builder().build()

    private val tokenAdapter = moshi.adapter<List<TokenBalance>>(
        Types.newParameterizedType(List::class.java, TokenBalance::class.java)
    )
    private val txAdapter = moshi.adapter<List<Transaction>>(
        Types.newParameterizedType(List::class.java, Transaction::class.java)
    )

    private val defaultTokens = listOf(TokenBalance("ETH", 1.2, 3050.0), TokenBalance("BTC", 0.14, 62000.0))
    private val defaultTxs = listOf(Transaction("0xabc", "Ethereum", 0.32, "2026-05-02T12:00:00Z", "CONFIRMED"))

    private val tokenState = MutableStateFlow(loadCachedTokens())
    private val txState = MutableStateFlow(loadCachedTransactions())

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
        val txHash = "tx_${to.take(6)}_${token}_${amount}"
        val updated = listOf(Transaction(txHash, "Ethereum", amount, "2026-05-04T00:00:00Z", "PENDING")) + txState.value
        txState.value = updated
        persistTransactions(updated)
        return txHash
    }

    override suspend fun quoteSwap(from: String, to: String, amount: Double): SwapQuote {
        require(from != to) { "Swap pair must be different assets" }
        require(amount > 0) { "Amount must be greater than zero" }
        return SwapQuote(from, to, 0.94)
    }

    private fun loadCachedTokens(): List<TokenBalance> =
        cachePrefs.getString("tokens", null)?.let { tokenAdapter.fromJson(it) } ?: defaultTokens

    private fun loadCachedTransactions(): List<Transaction> =
        cachePrefs.getString("transactions", null)?.let { txAdapter.fromJson(it) } ?: defaultTxs

    private fun persistTransactions(transactions: List<Transaction>) {
        cachePrefs.edit().putString("transactions", txAdapter.toJson(transactions)).apply()
    }
}
