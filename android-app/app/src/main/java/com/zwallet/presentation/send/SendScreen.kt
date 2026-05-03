package com.zwallet.presentation.send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.foundation.layout.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.zwallet.presentation.common.WalletViewModel
@Composable fun SendScreen(vm: WalletViewModel) { var to by remember{ mutableStateOf("") }; var token by remember{ mutableStateOf("ETH") }; var amount by remember{ mutableStateOf("0") }
Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)){Text("Send Crypto");OutlinedTextField(to,{to=it},label={Text("Recipient")});OutlinedTextField(token,{token=it},label={Text("Token")});OutlinedTextField(amount,{amount=it},label={Text("Amount")});Button(onClick={vm.send(to,token,amount.toDoubleOrNull()?:0.0)}){Text("Send")}}
}
