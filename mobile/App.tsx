import React, { useState } from 'react';
import { Button, SafeAreaView, Text, TextInput, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

export default function App() {
  const [tenantId, setTenantId] = useState('demo-tenant');
  const [status, setStatus] = useState('Ready');
  const [intentId, setIntentId] = useState('');

  async function createIntent() {
    const res = await fetch(`${API}/v1/tx/intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
        'x-tenant-plan': 'pro',
        'x-tenant-region': 'us-east-1'
      }
    });
    if (!res.ok) return setStatus('Intent failed');
    const data = await res.json();
    setIntentId(data.intentId);
    await SecureStore.setItemAsync('last_intent', data.intentId);
    setStatus('Intent created. Ready for on-device signing.');
  }

  return (
    <SafeAreaView style={{ padding: 20 }}>
      <View style={{ gap: 10 }}>
        <Text>zWallet Multi-chain Client</Text>
        <TextInput value={tenantId} onChangeText={setTenantId} placeholder='Tenant ID' />
        <Button title='Create Transaction Intent' onPress={createIntent} />
        <Text>Status: {status}</Text>
        <Text>Intent ID: {intentId}</Text>
      </View>
    </SafeAreaView>
  );
}
