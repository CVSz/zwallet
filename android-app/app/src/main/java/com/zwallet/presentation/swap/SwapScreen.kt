package com.zwallet.presentation.swap
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.foundation.layout.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.zwallet.presentation.common.WalletViewModel
@Composable fun SwapScreen(vm: WalletViewModel){ var from by remember{ mutableStateOf("ETH")}; var to by remember{ mutableStateOf("USDC")}; var amount by remember{ mutableStateOf("1")}; Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)){Text("Swap");OutlinedTextField(from,{from=it},label={Text("From")});OutlinedTextField(to,{to=it},label={Text("To")});OutlinedTextField(amount,{amount=it},label={Text("Amount")});Button(onClick={/*hook to quote+execute via backend*/}){Text("Get Quote / Swap")}}
}
