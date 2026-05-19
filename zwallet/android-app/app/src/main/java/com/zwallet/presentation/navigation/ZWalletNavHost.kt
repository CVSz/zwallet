package com.zwallet.presentation.navigation

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.*
import com.zwallet.presentation.auth.AuthScreen
import com.zwallet.presentation.common.WalletViewModel
import com.zwallet.presentation.dashboard.DashboardScreen
import com.zwallet.presentation.history.HistoryScreen
import com.zwallet.presentation.receive.ReceiveScreen
import com.zwallet.presentation.send.SendScreen
import com.zwallet.presentation.swap.SwapScreen
import com.zwallet.presentation.tokens.TokensScreen

@Composable
fun ZWalletNavHost(vm: WalletViewModel = hiltViewModel()) {
    val nav = rememberNavController()
    NavHost(navController = nav, startDestination = "auth") {
        composable("auth") { AuthScreen(vm) { nav.navigate("dashboard") } }
        composable("dashboard") { DashboardScreen(vm, nav) }
        composable("send") { SendScreen(vm) }
        composable("receive") { ReceiveScreen(vm) }
        composable("swap") { SwapScreen(vm) }
        composable("history") { HistoryScreen(vm) }
        composable("tokens") { TokensScreen(vm) }
    }
}
