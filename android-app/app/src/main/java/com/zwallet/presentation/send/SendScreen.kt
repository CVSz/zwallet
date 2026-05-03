package com.zwallet.presentation.send

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
fun SendScreen(vm: WalletViewModel) {
    val state by vm.sendState.collectAsState()
    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Send Crypto")
        OutlinedTextField(state.recipient, { vm.onSendInput(it, state.token, state.amount) }, label = { Text("Recipient") })
        OutlinedTextField(state.token, { vm.onSendInput(state.recipient, it, state.amount) }, label = { Text("Token") })
        OutlinedTextField(state.amount, { vm.onSendInput(state.recipient, state.token, it) }, label = { Text("Amount") })
        Text("Estimated fee: ${state.feeEstimate}")
        Button(onClick = { vm.submitSend() }, enabled = !state.submitting) { Text("Submit Send") }
        if (state.submitting) CircularProgressIndicator()
        state.error?.let { Text("Error: $it") }
        state.submittedTxHash?.let { Text("Submitted: $it") }
    }
}
