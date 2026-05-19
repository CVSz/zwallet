package com.zwallet.presentation.swap

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.zwallet.presentation.common.WalletViewModel

@Composable
fun SwapScreen(vm: WalletViewModel) {
    val state by vm.swapState.collectAsState()
    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Swap")
        OutlinedTextField(state.fromToken, { vm.onSwapInput(it, state.toToken, state.amount) }, label = { Text("From") })
        OutlinedTextField(state.toToken, { vm.onSwapInput(state.fromToken, it, state.amount) }, label = { Text("To") })
        OutlinedTextField(state.amount, { vm.onSwapInput(state.fromToken, state.toToken, it) }, label = { Text("Amount") })
        Button(onClick = { vm.requestSwapQuote() }) { Text("Get Quote") }
        if (state.loadingQuote) CircularProgressIndicator()
        state.quote?.let { Text("Quote: 1 ${it.fromToken} = ${it.rate} ${it.toToken}") }
        Button(onClick = { vm.executeSwap() }) { Text("Execute Swap") }
        state.error?.let { Text("Error: $it") }
        state.executionResult?.let { Text(it) }
    }
}
