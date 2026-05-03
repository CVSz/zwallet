import React, { useState } from 'react';
import { Button, SafeAreaView, TextInput, Text, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');

  async function login() {
    const res = await fetch(`${API}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      setStatus('Login failed');
      return;
    }
    const data = await res.json();
    await SecureStore.setItemAsync('access_token', data.access_token, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK
    });
    setStatus('Logged in securely');
  }

  return (
    <SafeAreaView style={{ padding: 24 }}>
      <View style={{ gap: 12 }}>
        <Text>ZWallet Secure Login</Text>
        <TextInput autoCapitalize='none' placeholder='Email' value={email} onChangeText={setEmail} />
        <TextInput secureTextEntry placeholder='Password' value={password} onChangeText={setPassword} />
        <Button title='Login' onPress={login} />
        <Text>{status}</Text>
      </View>
    </SafeAreaView>
  );
}
