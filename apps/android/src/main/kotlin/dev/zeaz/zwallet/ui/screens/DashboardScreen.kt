package dev.zeaz.zwallet.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

/**
 * zWallet Android Dashboard Screen
 * Implements the Zeaz Unified Design System in Jetpack Compose.
 */
@Composable
fun DashboardScreen() {
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Color(0xFF0F172A) // Deep Space Blue
    ) {
        Column(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth()
        ) {
            Text(
                text = "zWallet World",
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Asset Card
            AssetCard(name = "ZEA Stablecoin", balance = "1,250.00", symbol = "ZEA")
            Spacer(modifier = Modifier.height(16.dp))
            AssetCard(name = "ZEAZ Governance", balance = "5,000.00", symbol = "ZEAZ")
            
            Spacer(modifier = Modifier.height(32.dp))
            
            // Security Status
            SecurityStatusCard()
        }
    }
}

@Composable
fun AssetCard(name: String, balance: String, symbol: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color(0x1AFFFFFF))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(text = name, color = Color.Gray, style = MaterialTheme.typography.labelMedium)
            Text(
                text = "$balance $symbol",
                color = Color(0xFF6366F1), // Electric Indigo
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.ExtraBold
            )
        }
    }
}

@Composable
fun SecurityStatusCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color(0x0D6366F1))
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(text = "Security Level", color = Color.White)
            Text(text = "HIGHTEST", color = Color.Green, fontWeight = FontWeight.Bold)
        }
    }
}
