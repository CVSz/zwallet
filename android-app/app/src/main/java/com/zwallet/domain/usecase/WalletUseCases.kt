package com.zwallet.domain.usecase

import com.zwallet.domain.repository.WalletRepository
import javax.inject.Inject

class WalletUseCases @Inject constructor(private val repo: WalletRepository) {
    suspend fun createWallet() = repo.createWallet()
    suspend fun importWallet(mnemonic: String) = repo.importWallet(mnemonic)
    fun portfolio() = repo.portfolio()
    fun transactions() = repo.transactions()
    fun tokens() = repo.tokens()
    suspend fun send(to: String, token: String, amount: Double) = repo.send(to, token, amount)
    suspend fun quoteSwap(from: String, to: String, amount: Double) = repo.quoteSwap(from, to, amount)
}
