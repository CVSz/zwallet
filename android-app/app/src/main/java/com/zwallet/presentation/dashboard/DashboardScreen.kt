package com.zwallet.presentation.dashboard

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.zwallet.presentation.common.WalletViewModel

@Composable
fun DashboardScreen(vm: WalletViewModel, nav: NavController) {
    val portfolio by vm.portfolio.collectAsState(initial = emptyList())
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Portfolio", style = MaterialTheme.typography.headlineSmall)
        LazyColumn(Modifier.weight(1f)) { items(portfolio) { Text("${it.symbol}: ${it.amount} ($${it.usdPrice})") } }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("send", "receive", "swap", "history", "tokens").forEach { route ->
                Button(onClick = { nav.navigate(route) }) { Text(route.replaceFirstChar { it.uppercase() }) }
            }
        }
    }
}
