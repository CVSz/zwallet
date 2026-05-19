package com.zwallet.domain.model

data class Wallet(val id: String, val address: String, val recoveryHint: String)
data class TokenBalance(val symbol: String, val amount: Double, val usdPrice: Double)
data class Transaction(val hash: String, val chain: String, val amount: Double, val timestamp: String, val status: String)
data class SwapQuote(val fromToken: String, val toToken: String, val rate: Double)

enum class WalletSetupStep { IDLE, CREATING, IMPORTING, SUCCESS, ERROR }

data class WalletSetupState(
    val step: WalletSetupStep = WalletSetupStep.IDLE,
    val wallet: Wallet? = null,
    val message: String? = null
)

data class SendState(
    val recipient: String = "",
    val token: String = "ETH",
    val amount: String = "",
    val feeEstimate: String = "--",
    val submitting: Boolean = false,
    val error: String? = null,
    val submittedTxHash: String? = null
)

data class SwapState(
    val fromToken: String = "ETH",
    val toToken: String = "USDC",
    val amount: String = "",
    val loadingQuote: Boolean = false,
    val quote: SwapQuote? = null,
    val executing: Boolean = false,
    val error: String? = null,
    val executionResult: String? = null
)
