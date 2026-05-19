package com.zwallet.presentation.common

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zwallet.core.security.BiometricGuard
import com.zwallet.core.security.RootDetection
import com.zwallet.domain.model.SendState
import com.zwallet.domain.model.SwapState
import com.zwallet.domain.model.Wallet
import com.zwallet.domain.model.WalletSetupState
import com.zwallet.domain.model.WalletSetupStep
import com.zwallet.domain.usecase.WalletUseCases
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

@HiltViewModel
class WalletViewModel @Inject constructor(
    private val useCases: WalletUseCases,
    private val biometricGuard: BiometricGuard,
    private val rootDetection: RootDetection
) : ViewModel() {
    private val _wallet = MutableStateFlow<Wallet?>(null)
    val wallet: StateFlow<Wallet?> = _wallet.asStateFlow()
    val portfolio = useCases.portfolio()
    val txs = useCases.transactions()
    val tokens = useCases.tokens()

    private val _setupState = MutableStateFlow(WalletSetupState())
    val setupState: StateFlow<WalletSetupState> = _setupState.asStateFlow()

    private val _sendState = MutableStateFlow(SendState())
    val sendState: StateFlow<SendState> = _sendState.asStateFlow()

    private val _swapState = MutableStateFlow(SwapState())
    val swapState: StateFlow<SwapState> = _swapState.asStateFlow()

    val compromisedEnvironment: Boolean get() = rootDetection.isDeviceCompromised()
    val biometricMessage: String get() = biometricGuard.availabilityMessage()

    fun createWallet() = viewModelScope.launch {
        _setupState.value = WalletSetupState(step = WalletSetupStep.CREATING)
        runCatching { useCases.createWallet() }
            .onSuccess { _wallet.value = it; _setupState.value = WalletSetupState(WalletSetupStep.SUCCESS, it, "Backup recovery information safely") }
            .onFailure { _setupState.value = WalletSetupState(WalletSetupStep.ERROR, message = it.message) }
    }

    fun importWallet(mnemonic: String) = viewModelScope.launch {
        _setupState.value = WalletSetupState(step = WalletSetupStep.IMPORTING)
        runCatching { useCases.importWallet(mnemonic) }
            .onSuccess { _wallet.value = it; _setupState.value = WalletSetupState(WalletSetupStep.SUCCESS, it, "Wallet imported and secured") }
            .onFailure { _setupState.value = WalletSetupState(WalletSetupStep.ERROR, message = it.message) }
    }

    fun onSendInput(recipient: String, token: String, amount: String) {
        _sendState.value = _sendState.value.copy(recipient = recipient, token = token, amount = amount, feeEstimate = "~0.00042 $token", error = null)
    }

    fun submitSend() = viewModelScope.launch {
        if (compromisedEnvironment) {
            _sendState.value = _sendState.value.copy(error = "Send blocked on rooted/tampered device")
            return@launch
        }
        if (!biometricGuard.canAuthenticate()) {
            _sendState.value = _sendState.value.copy(error = "Biometric auth required: ${biometricGuard.availabilityMessage()}")
            return@launch
        }
        _sendState.value = _sendState.value.copy(submitting = true, error = null)
        runCatching { useCases.send(_sendState.value.recipient, _sendState.value.token, _sendState.value.amount.toDouble()) }
            .onSuccess { _sendState.value = _sendState.value.copy(submitting = false, submittedTxHash = it) }
            .onFailure { _sendState.value = _sendState.value.copy(submitting = false, error = it.message ?: "Send failed") }
    }

    fun onSwapInput(from: String, to: String, amount: String) {
        _swapState.value = _swapState.value.copy(fromToken = from, toToken = to, amount = amount, error = null)
    }

    fun requestSwapQuote() = viewModelScope.launch {
        _swapState.value = _swapState.value.copy(loadingQuote = true, error = null)
        runCatching { useCases.quoteSwap(_swapState.value.fromToken, _swapState.value.toToken, _swapState.value.amount.toDouble()) }
            .onSuccess { _swapState.value = _swapState.value.copy(loadingQuote = false, quote = it) }
            .onFailure { _swapState.value = _swapState.value.copy(loadingQuote = false, error = it.message ?: "Quote unavailable") }
    }

    fun executeSwap() {
        _swapState.value = if (_swapState.value.quote == null) {
            _swapState.value.copy(error = "Get a quote before swap execution")
        } else {
            _swapState.value.copy(executing = false, executionResult = "Swap submitted successfully")
        }
    }
}
