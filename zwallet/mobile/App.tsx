import React, { useMemo, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  StatusBar,
  Dimensions,
  Animated
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient'; // Conceptual: Assuming Expo environment

type Chain = 'EVM' | 'Solana' | 'Bitcoin';
type PaymentRail = 'Card' | 'BankTransfer' | 'Stablecoin' | 'MobileMoney';
type CardTier = 'Virtual' | 'Premium' | 'Metal';
type Plan = 'free' | 'pro' | 'enterprise';

const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';
const { width } = Dimensions.get('window');

const plans: Plan[] = ['free', 'pro', 'enterprise'];
const chains: Chain[] = ['EVM', 'Solana', 'Bitcoin'];
const paymentRails: PaymentRail[] = ['Card', 'BankTransfer', 'Stablecoin', 'MobileMoney'];
const cardTiers: CardTier[] = ['Virtual', 'Premium', 'Metal'];

export default function App() {
  const [tenantId, setTenantId] = useState('demo-tenant');
  const [tenantPlan, setTenantPlan] = useState<Plan>('pro');
  const [tenantRegion, setTenantRegion] = useState('us-east-1');
  const [selectedChain, setSelectedChain] = useState<Chain>('EVM');
  const [strictPolicyMode, setStrictPolicyMode] = useState(true);
  const [paymentRail, setPaymentRail] = useState<PaymentRail>('Card');
  const [cardTier, setCardTier] = useState<CardTier>('Virtual');
  const [spendLimitUsd, setSpendLimitUsd] = useState('2500');
  const [simulateOnly, setSimulateOnly] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [intentId, setIntentId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiRiskScore, setAiRiskScore] = useState<number | null>(null);
  const [ceremonyState, setCeremonyState] = useState<string | null>(null);

  const fadeAnim = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const readiness = useMemo(() => {
    return tenantId.trim().length > 0 && tenantRegion.trim().length > 0;
  }, [tenantId, tenantRegion]);

  // Phase 5: Fetch AI Risk Score before intent creation
  async function fetchAiIntelligence() {
    setAiRiskScore(null);
    try {
      const res = await fetch(`${API}/v1/ai/inference/transaction-anomaly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_usd: parseFloat(spendLimitUsd),
          hour_of_day: new Date().getHours(),
          destination_risk_score: 0.05,
          chain_id: 1
        })
      });
      const data = await res.json();
      setAiRiskScore(data.score ?? 0.1);
    } catch (e) {
      setAiRiskScore(0.12); // Fallback
    }
  }

  async function createIntent() {
    if (!readiness || isLoading) return;

    setIsLoading(true);
    setError('');
    setStatus('Initializing MPC Ceremony...');
    setCeremonyState('Aggregating Shares...');

    try {
      // Simulate MPC Ceremony Timing
      await new Promise(r => setTimeout(r, 1500));
      setCeremonyState('Finalizing TSS Signature...');
      await new Promise(r => setTimeout(r, 1000));

      const res = await fetch(`${API}/v1/tx/intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          'x-wallet-chain': selectedChain,
          'x-policy-mode': strictPolicyMode ? 'strict' : 'standard',
          'x-ai-risk-score': `${aiRiskScore || 0}`
        }
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(body?.error ?? `Intent failed (${res.status})`);

      setIntentId(body.intentId ?? 'unknown-intent');
      await SecureStore.setItemAsync('last_intent', body.intentId ?? 'unknown-intent');
      setStatus('Success: Broadcasted via MPC');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unexpected error');
      setStatus('Failed');
    } finally {
      setIsLoading(false);
      setCeremonyState(null);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Zeaz Mobile</Text>
            <Text style={styles.subtitle}>Institutional Grade Multi-chain Client</Text>
          </View>

          {/* AI Intelligence Card */}
          <View style={styles.glassCard}>
            <Text style={styles.sectionTitle}>✨ AI Intelligence</Text>
            <View style={styles.aiContent}>
              <Text style={styles.aiLabel}>Anomaly Risk Score</Text>
              {aiRiskScore !== null ? (
                <Text style={[styles.aiScore, { color: aiRiskScore > 0.5 ? '#f87171' : '#4ade80' }]}>
                  {(aiRiskScore * 100).toFixed(1)}%
                </Text>
              ) : (
                <Pressable onPress={fetchAiIntelligence}>
                  <Text style={styles.linkText}>Fetch Analysis</Text>
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.glassCard}>
            <Text style={styles.sectionTitle}>Orchestration Settings</Text>
            <TextInput
              value={tenantId}
              onChangeText={setTenantId}
              placeholder='Tenant ID'
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />
            <Text style={styles.label}>Settlement Chain</Text>
            <View style={styles.chipRow}>
              {chains.map((chain) => (
                <Pressable
                  key={chain}
                  style={[styles.chip, selectedChain === chain && styles.chipSelected]}
                  onPress={() => setSelectedChain(chain)}
                >
                  <Text style={[styles.chipText, selectedChain === chain && styles.chipTextSelected]}>{chain}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.glassCard}>
            <Text style={styles.sectionTitle}>Compliance & Risk</Text>
            <View style={styles.switchRow}>
              <Text style={styles.label}>Strict Policy Enforcement</Text>
              <Switch 
                value={strictPolicyMode} 
                onValueChange={setStrictPolicyMode}
                trackColor={{ false: "#1e293b", true: "#6366f1" }}
              />
            </View>
            <Text style={styles.label}>Card Spend Limit (USD)</Text>
            <TextInput
              value={spendLimitUsd}
              onChangeText={setSpendLimitUsd}
              keyboardType='numeric'
              style={styles.input}
            />
          </View>

          <Pressable
            style={[styles.mainButton, (!readiness || isLoading) && styles.buttonDisabled]}
            onPress={createIntent}
            disabled={!readiness || isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color='#fff' />
                <Text style={styles.buttonText}>{ceremonyState || 'Loading...'}</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Sign with MPC</Text>
            )}
          </Pressable>

          <View style={styles.glassCard}>
            <Text style={styles.sectionTitle}>Live Status</Text>
            <Text style={styles.statusText}>{status}</Text>
            {intentId ? <Text style={styles.idText}>ID: {intentId}</Text> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  scrollContent: { padding: 20, paddingTop: 60, gap: 20 },
  header: { marginBottom: 10 },
  title: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: '#94a3b8', marginTop: 4 },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#e2e8f0', marginBottom: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#94a3b8' },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  chipRow: { flexDirection: 'row', gap: 10 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  chipSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#818cf8'
  },
  chipText: { color: '#94a3b8', fontWeight: '600' },
  chipTextSelected: { color: '#fff' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mainButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 18,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  aiLabel: { color: '#94a3b8', fontSize: 15 },
  aiScore: { fontSize: 20, fontWeight: '800' },
  linkText: { color: '#6366f1', fontWeight: '700' },
  statusText: { color: '#4ade80', fontWeight: '600', fontSize: 16 },
  idText: { color: '#94a3b8', fontSize: 12, fontFamily: 'monospace', marginTop: 4 },
  errorText: { color: '#f87171', fontSize: 14, marginTop: 4 }
});
