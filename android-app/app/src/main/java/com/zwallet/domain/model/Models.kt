package com.zwallet.domain.model

data class Wallet(val id: String, val address: String, val mnemonicHint: String)
data class TokenBalance(val symbol: String, val amount: Double, val usdPrice: Double)
data class Transaction(val hash: String, val chain: String, val amount: Double, val timestamp: String, val status: String)
data class SwapQuote(val fromToken: String, val toToken: String, val rate: Double)
