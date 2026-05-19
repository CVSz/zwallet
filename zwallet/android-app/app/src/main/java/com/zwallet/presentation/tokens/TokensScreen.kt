package com.zwallet.presentation.tokens
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import com.zwallet.presentation.common.WalletViewModel
@Composable fun TokensScreen(vm: WalletViewModel){ val tokens by vm.tokens.collectAsState(initial= emptyList()); LazyColumn{ items(tokens){ Text("${it.symbol} price: $${it.usdPrice}") } } }
