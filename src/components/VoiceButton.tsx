import React from 'react';
import { StyleSheet, TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

interface Props {
  isListening: boolean;
  onStart: () => void;
  onStop: () => void;
}

export default function VoiceButton({ isListening, onStart, onStop }: Props) {
  return (
    <TouchableOpacity
      style={[styles.button, isListening && styles.buttonActive]}
      onPress={isListening ? onStop : onStart}
      activeOpacity={0.7}
    >
      {isListening ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <Ionicons name="mic-outline" size={22} color={COLORS.onPrimary} />
      )}
      <Text style={styles.text}>{isListening ? '点击停止' : '语音输入'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    gap: 8,
  },
  buttonActive: { backgroundColor: COLORS.danger },
  text: { color: COLORS.onPrimary, fontSize: 15, fontWeight: '600' },
});
