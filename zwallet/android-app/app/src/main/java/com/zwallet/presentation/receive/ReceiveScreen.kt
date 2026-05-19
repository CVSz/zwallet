package com.zwallet.presentation.receive
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.foundation.layout.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.zwallet.presentation.common.WalletViewModel
@Composable fun ReceiveScreen(vm: WalletViewModel){ val wallet by vm.wallet.collectAsState(); Column(Modifier.padding(16.dp)){Text("Receive"); Text("Address: ${wallet?.address ?: "Create/import first"}")}}
