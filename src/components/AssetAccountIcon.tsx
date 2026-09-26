import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { getAssetProvider } from '../utils/assetProviders';

export default function AssetAccountIcon({ provider, size = 46 }: { provider: string; size?: number }) {
  const item = getAssetProvider(provider);
  return (
    <View style={[styles.icon, { width: size, height: size, borderRadius: size * 0.3, backgroundColor: item.color + '14' }]}>
      {item.kind === 'bank' ? (
        <View style={[styles.bank, { width: size * 0.65, height: size * 0.65, borderRadius: size, borderColor: item.color }]}>
          <Text style={{ color: item.color, fontSize: size * 0.36, fontWeight: '800' }}>{item.short}</Text>
        </View>
      ) : item.kind === 'wechat' || item.kind === 'alipay' ? (
        <FontAwesome5 name={item.kind === 'wechat' ? 'weixin' : 'alipay'} size={size * 0.56} color={item.color} />
      ) : (
        <Ionicons name={item.kind === 'cash' ? 'cash-outline' : 'wallet-outline'} size={size * 0.55} color={item.color} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { alignItems: 'center', justifyContent: 'center' },
  bank: { borderWidth: 1.8, alignItems: 'center', justifyContent: 'center' },
});
