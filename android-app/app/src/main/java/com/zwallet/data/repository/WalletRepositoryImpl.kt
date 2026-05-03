package com.zwallet.data.repository

import com.zwallet.domain.model.*
import com.zwallet.domain.repository.WalletRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WalletRepositoryImpl @Inject constructor() : WalletRepository {
    private val tokenState = MutableStateFlow(listOf(TokenBalance("ETH", 1.2, 3050.0), TokenBalance("BTC", 0.14, 62000.0)))
    private val txState = MutableStateFlow(listOf(Transaction("0xabc", "Ethereum", 0.32, "2026-05-02T12:00:00Z", "CONFIRMED")))

    override suspend fun createWallet(): Wallet = Wallet(UUID.randomUUID().toString(), "0x${UUID.randomUUID()}", "word1 ... word12")
    override suspend fun importWallet(mnemonic: String): Wallet = Wallet(UUID.randomUUID().toString(), "0x${mnemonic.hashCode()}", mnemonic.take(10))
    override fun portfolio(): Flow<List<TokenBalance>> = tokenState.asStateFlow()
    override fun transactions(): Flow<List<Transaction>> = txState.asStateFlow()
    override fun tokens(): Flow<List<TokenBalance>> = tokenState.asStateFlow()
    override suspend fun send(to: String, token: String, amount: Double): String = "tx_${to.take(4)}_$token_$amount"
    override suspend fun quoteSwap(from: String, to: String, amount: Double): SwapQuote = SwapQuote(from, to, 0.94)
}
