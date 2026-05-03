package com.zwallet.presentation.common

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zwallet.domain.model.TokenBalance
import com.zwallet.domain.model.Transaction
import com.zwallet.domain.model.Wallet
import com.zwallet.domain.usecase.WalletUseCases
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

@HiltViewModel
class WalletViewModel @Inject constructor(private val useCases: WalletUseCases) : ViewModel() {
    private val _wallet = MutableStateFlow<Wallet?>(null)
    val wallet: StateFlow<Wallet?> = _wallet.asStateFlow()
    val portfolio = useCases.portfolio()
    val txs = useCases.transactions()
    val tokens = useCases.tokens()

    fun createWallet() = viewModelScope.launch { _wallet.value = useCases.createWallet() }
    fun importWallet(mnemonic: String) = viewModelScope.launch { _wallet.value = useCases.importWallet(mnemonic) }
    fun send(to: String, token: String, amount: Double) = viewModelScope.launch { useCases.send(to, token, amount) }
}
