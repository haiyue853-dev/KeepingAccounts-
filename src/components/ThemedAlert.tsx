import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface ThemedAlertProps {
  visible: boolean;
  title: string;
  message: string;
  icon?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  singleButton?: boolean;
  buttons?: AlertButton[];
}

export default function ThemedAlert({
  visible, title, message, icon = 'alert-circle-outline',
  confirmText = '确定', cancelText = '取消',
  onConfirm, onCancel, singleButton = false, buttons,
}: ThemedAlertProps) {
  // 如果传入了自定义按钮数组
  if (buttons && buttons.length > 0) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => buttons[buttons.length - 1].onPress?.()}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <View style={styles.iconWrap}>
              <Ionicons name={icon as any} size={28} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
            <View style={styles.btnRow}>
              {buttons.map((btn, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.cancelBtn,
                    btn.style === 'default' && styles.confirmBtn,
                    btn.style === 'destructive' && styles.destructiveBtn,
                  ]}
                  onPress={btn.onPress}
                >
                  <Text style={[
                    styles.cancelText,
                    btn.style === 'default' && styles.confirmText,
                    btn.style === 'destructive' && styles.destructiveText,
                  ]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // 默认的单按钮/双按钮模式
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel || onConfirm}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.iconWrap}>
            <Ionicons name={icon as any} size={28} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.btnRow}>
            {!singleButton && onCancel && (
              <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                <Text style={styles.cancelText}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.divider,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  destructiveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
  },
  destructiveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
