package com.zwallet.presentation.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.zwallet.presentation.common.WalletViewModel

@Composable
fun AuthScreen(vm: WalletViewModel, onSuccess: () -> Unit) {
    var mnemonic by remember { mutableStateOf("") }
    val setup by vm.setupState.collectAsState()
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Create or import wallet", style = MaterialTheme.typography.headlineSmall)
        Text("Security: ${vm.biometricMessage}")
        if (vm.compromisedEnvironment) Text("Warning: rooted/tampered environment detected; sensitive actions are reduced")
        OutlinedTextField(mnemonic, { mnemonic = it }, label = { Text("Recovery phrase") })
        Button(onClick = { vm.createWallet() }) { Text("Create Wallet") }
        Button(onClick = { vm.importWallet(mnemonic) }) { Text("Import Wallet") }
        setup.message?.let { Text(it) }
        if (setup.wallet != null) Button(onClick = onSuccess) { Text("Continue") }
    }
}
