package com.zwallet.domain.repository

import com.zwallet.domain.model.*
import kotlinx.coroutines.flow.Flow

interface WalletRepository {
    suspend fun createWallet(): Wallet
    suspend fun importWallet(mnemonic: String): Wallet
    fun portfolio(): Flow<List<TokenBalance>>
    fun transactions(): Flow<List<Transaction>>
    fun tokens(): Flow<List<TokenBalance>>
    suspend fun send(to: String, token: String, amount: Double): String
    suspend fun quoteSwap(from: String, to: String, amount: Double): SwapQuote
}
