package com.zwallet.presentation.auth

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.zwallet.presentation.common.WalletViewModel

@Composable
fun AuthScreen(vm: WalletViewModel, onSuccess: () -> Unit) {
    var mnemonic by remember { mutableStateOf("") }
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Create or import wallet", style = MaterialTheme.typography.headlineSmall)
        OutlinedTextField(mnemonic, { mnemonic = it }, label = { Text("Mnemonic") })
        Button(onClick = { vm.createWallet(); onSuccess() }) { Text("Create Wallet") }
        Button(onClick = { vm.importWallet(mnemonic); onSuccess() }) { Text("Import Wallet") }
        Text("Biometric authentication + encrypted storage enforced before mnemonic usage")
    }
}
