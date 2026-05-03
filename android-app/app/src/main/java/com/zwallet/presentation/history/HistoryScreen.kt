package com.zwallet.presentation.history
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import com.zwallet.presentation.common.WalletViewModel
@Composable fun HistoryScreen(vm: WalletViewModel){ val txs by vm.txs.collectAsState(initial= emptyList()); LazyColumn{ items(txs){ Text("${it.chain} ${it.amount} ${it.status} ${it.hash}") } } }
