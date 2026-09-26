import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, Linking, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showThemedAlert } from '../components/AlertProvider';
import { COLORS, SHADOWS } from '../utils/constants';

const APP_VERSION = '1.3.2';
const AVATAR_STORAGE_KEY = 'profile.avatarUri';

function compressWebAvatar(source: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 256 / Math.max(image.width, image.height));
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('无法处理所选图片');
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error('无法读取所选图片'));
    image.src = source;
  });
}

const MENU_ITEMS = [
  { icon: 'pricetag-outline' as const, label: '分类管理', screen: 'Category' },
  { icon: 'wallet-outline' as const, label: '预算管理', screen: 'Budget' },
  { icon: 'briefcase-outline' as const, label: '资产管理', screen: 'Asset' },
  { icon: 'swap-horizontal-outline' as const, label: '导入导出', screen: 'ImportExport' },
  { icon: 'cloud-upload-outline' as const, label: '数据备份', screen: null },
  { icon: 'settings-outline' as const, label: '设置', screen: 'Settings' },
];

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(AVATAR_STORAGE_KEY)
      .then((uri) => { if (mounted) setAvatarUri(uri); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const changeAvatar = async () => {
    if (avatarBusy) return;
    setAvatarBusy(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true, base64: Platform.OS === 'web' });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset || (asset.mimeType && !asset.mimeType.startsWith('image/'))) throw new Error('请选择图片文件');

      let savedUri: string;
      if (Platform.OS === 'web') {
        if (!asset.base64) throw new Error('无法读取所选图片');
        savedUri = await compressWebAvatar(asset.base64);
      } else {
        const extension = asset.name.match(/\.(jpe?g|png|webp|heic|gif)$/i)?.[1]?.toLowerCase() ?? 'jpg';
        const destination = new File(Paths.document, `profile-avatar-${Date.now()}.${extension}`);
        await new File(asset.uri).copy(destination);
        savedUri = destination.uri;
      }

      await AsyncStorage.setItem(AVATAR_STORAGE_KEY, savedUri);
      const previousUri = avatarUri;
      setAvatarUri(savedUri);
      if (Platform.OS !== 'web' && previousUri?.startsWith(Paths.document.uri) && previousUri !== savedUri) {
        try {
          const previousFile = new File(previousUri);
          if (previousFile.exists) previousFile.delete();
        } catch {}
      }
    } catch (error) {
      showThemedAlert('头像更换失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setAvatarBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.headerSurface, '#F4F9FF', COLORS.surface]} style={[styles.header, { paddingTop: (insets.top || 24) + 10 }]}>
        <View style={styles.profileRow}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="更换头像" disabled={avatarBusy} onPress={changeAvatar} style={styles.avatar} activeOpacity={0.75}>
            {avatarUri ? <Image source={{ uri: avatarUri }} style={styles.avatarImage} onError={() => { setAvatarUri(null); void AsyncStorage.removeItem(AVATAR_STORAGE_KEY); }} /> : <Ionicons name="person-outline" size={27} color={COLORS.primaryDark} />}
          </TouchableOpacity>
          <View style={styles.userInfo}>
            <Text style={styles.username}>我的账户</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.menuList}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, index === MENU_ITEMS.length - 1 && styles.menuItemLast]}
              onPress={() => {
                if (item.screen) {
                  navigation.navigate(item.screen);
                } else {
                  Alert.alert('提示', '功能开发中');
                }
              }}
              activeOpacity={0.75}
            >
              <View style={styles.menuIconWrap}>
                <Ionicons name={item.icon} size={19} color={COLORS.text} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={17} color={COLORS.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        {/* 关于 */}
        <View style={styles.aboutSection}>
          <Text style={styles.aboutTitle}>关于哈基咪记账</Text>
          <Text style={styles.aboutVersion}>版本 {APP_VERSION}</Text>
          <Text style={styles.aboutText}>简单清晰地管理收支与资产</Text>
          <TouchableOpacity
            style={styles.emailRow}
            onPress={() => Linking.openURL('mailto:hibozeng@qq.com')}
          >
            <Ionicons name="mail-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.emailText}>hibozeng@qq.com</Text>
          </TouchableOpacity>
          <Text style={styles.aboutHint}>如有问题或建议，欢迎发送邮件反馈</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.headerSurface,
    paddingHorizontal: 18,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.controlBorder,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: 54, height: 54, borderRadius: 27 },
  userInfo: { flex: 1 },
  username: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  menuList: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.controlSurface,
    borderWidth: 1,
    borderColor: COLORS.controlBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuLabel: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '600' },
  aboutSection: {
    marginHorizontal: 16,
    marginTop: 32,
    marginBottom: 32,
    padding: 24,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  aboutTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  aboutVersion: { fontSize: 12, color: COLORS.textLight, marginBottom: 8 },
  aboutText: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.background,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 6,
  },
  emailText: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  aboutHint: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
});
