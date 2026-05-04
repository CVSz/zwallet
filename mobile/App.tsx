import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';
import * as SecureStore from 'expo-secure-store';

type Chain = 'EVM' | 'Solana' | 'Bitcoin';
type PaymentRail = 'Card' | 'BankTransfer' | 'Stablecoin' | 'MobileMoney';
type CardTier = 'Virtual' | 'Premium' | 'Metal';

type Plan = 'free' | 'pro' | 'enterprise';

const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

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

  const readiness = useMemo(() => {
    const checks = [
      tenantId.trim().length > 0,
      tenantRegion.trim().length > 0
    ];

    return checks.every(Boolean);
  }, [tenantId, tenantRegion]);

  async function createIntent() {
    if (!readiness || isLoading) {
      return;
    }

    setIsLoading(true);
    setError('');
    setStatus('Submitting intent request...');

    try {
      const res = await fetch(`${API}/v1/tx/intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          'x-tenant-plan': tenantPlan,
          'x-tenant-region': tenantRegion,
          'x-wallet-chain': selectedChain,
          'x-policy-mode': strictPolicyMode ? 'strict' : 'standard',
          'x-simulate-only': `${simulateOnly}`,
          'x-payment-rail': paymentRail,
          'x-card-tier': cardTier,
          'x-card-spend-limit-usd': spendLimitUsd.trim() || '0'
        }
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message = body?.error ?? `Intent failed (${res.status})`;
        throw new Error(message);
      }

      setIntentId(body.intentId ?? 'unknown-intent');
      await SecureStore.setItemAsync('last_intent', body.intentId ?? 'unknown-intent');
      setStatus('Intent created. Ready for on-device signing.');
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unexpected error';
      setError(message);
      setStatus('Intent failed. Review error below.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>zWallet Multi-chain Client</Text>
        <Text style={styles.subtitle}>Intent Builder + Policy Simulation</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Tenant Settings</Text>
          <TextInput
            value={tenantId}
            onChangeText={setTenantId}
            placeholder='Tenant ID'
            style={styles.input}
          />
          <TextInput
            value={tenantRegion}
            onChangeText={setTenantRegion}
            placeholder='Region (e.g. us-east-1)'
            style={styles.input}
          />

          <Text style={styles.label}>Plan</Text>
          <View style={styles.chipRow}>
            {plans.map((plan) => (
              <Pressable
                key={plan}
                style={[styles.chip, tenantPlan === plan && styles.chipSelected]}
                onPress={() => setTenantPlan(plan)}
              >
                <Text style={[styles.chipText, tenantPlan === plan && styles.chipTextSelected]}>{plan}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Transaction Options</Text>
          <Text style={styles.label}>Chain</Text>
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

          <View style={styles.switchRow}>
            <Text>Strict policy mode</Text>
            <Switch value={strictPolicyMode} onValueChange={setStrictPolicyMode} />
          </View>

          <View style={styles.switchRow}>
            <Text>Simulation only (no broadcast)</Text>
            <Switch value={simulateOnly} onValueChange={setSimulateOnly} />
          </View>
        </View>


        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Crypto Card + Payment Rails</Text>
          <Text style={styles.helperText}>Choose settlement rail and card tier for fiat checkout + crypto funding flows.</Text>

          <Text style={styles.label}>Payment rail</Text>
          <View style={styles.chipRow}>
            {paymentRails.map((rail) => (
              <Pressable
                key={rail}
                style={[styles.chip, paymentRail === rail && styles.chipSelected]}
                onPress={() => setPaymentRail(rail)}
              >
                <Text style={[styles.chipText, paymentRail === rail && styles.chipTextSelected]}>{rail}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Card tier</Text>
          <View style={styles.chipRow}>
            {cardTiers.map((tier) => (
              <Pressable
                key={tier}
                style={[styles.chip, cardTier === tier && styles.chipSelected]}
                onPress={() => setCardTier(tier)}
              >
                <Text style={[styles.chipText, cardTier === tier && styles.chipTextSelected]}>{tier}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Card spend limit (USD)</Text>
          <TextInput
            value={spendLimitUsd}
            onChangeText={setSpendLimitUsd}
            keyboardType='numeric'
            placeholder='2500'
            style={styles.input}
          />
        </View>

        <Pressable
          style={[styles.button, (!readiness || isLoading) && styles.buttonDisabled]}
          onPress={createIntent}
          disabled={!readiness || isLoading}
        >
          {isLoading ? <ActivityIndicator color='#fff' /> : <Text style={styles.buttonText}>Create Transaction Intent</Text>}
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Execution Status</Text>
          <Text>Status: {status}</Text>
          <Text selectable>Intent ID: {intentId || '—'}</Text>
          {!!error && <Text style={styles.error}>Error: {error}</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { gap: 14, padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  subtitle: { color: '#475569', marginTop: -6 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: '#fff'
  },
  label: { fontWeight: '500', color: '#334155' },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fff'
  },
  chipSelected: { borderColor: '#1d4ed8', backgroundColor: '#dbeafe' },
  chipText: { color: '#334155' },
  chipTextSelected: { color: '#1e3a8a', fontWeight: '600' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  button: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center'
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '700' },
  error: { color: '#b91c1c' },
  helperText: { color: '#475569', fontSize: 13 }
});
