import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, BackHandler } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS } from '../utils/constants';
import { formatAmount } from '../utils/formatters';
import { getAssetProvider } from '../utils/assetProviders';
import { sumAssetBalances } from '../utils/assetAmount';
import type { AssetAccount, AssetAccountInput } from '../models/AssetAccount';
import { AssetAccountRepo } from '../repositories/AssetAccountRepo';
import { showThemedAlert, showThemedConfirm } from '../components/AlertProvider';
import AssetAccountIcon from '../components/AssetAccountIcon';
import AssetAccountEditor from '../components/AssetAccountEditor';

export default function AssetScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [accounts, setAccounts] = useState<AssetAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState<AssetAccount | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<number | null>(null);
  const deleteLock = useRef(false);

  const load = useCallback(async () => {
    try {
      const next = await AssetAccountRepo.getAll();
      setAccounts(next);
      setLoadError(false);
    } catch (e) {
      console.error('Asset accounts load failed:', e);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useFocusEffect(useCallback(() => {
    if (editing === undefined) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      setEditing(undefined);
      return true;
    });
    return () => listener.remove();
  }, [editing]));

  const save = async (input: AssetAccountInput) => {
    if (editing) await AssetAccountRepo.update(editing.id, input);
    else await AssetAccountRepo.create(input);
    setEditing(undefined);
    await load();
  };

  const remove = (account: AssetAccount) => {
    showThemedConfirm('删除账户', `确定删除「${account.name}」？总资产将移除该账户的余额。`, () => {
      void (async () => {
        if (deleteLock.current) return;
        deleteLock.current = true;
        setDeleting(account.id);
        try {
          await AssetAccountRepo.remove(account.id);
          await load();
        } catch (e) {
          showThemedAlert('删除失败', e instanceof Error ? e.message : '请重试');
        } finally {
          deleteLock.current = false;
          setDeleting(null);
        }
      })();
    }, '删除');
  };

  if (editing !== undefined) {
    return <AssetAccountEditor key={editing?.id ?? 'new'} account={editing} onSave={save}
      onCancel={() => setEditing(undefined)} insetsBottom={insets.bottom} insetsTop={insets.top} />;
  }

  const total = sumAssetBalances(accounts) / 100;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 + insets.bottom }} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={COLORS.primaryDark} colors={[COLORS.primaryDark]} />
      }>
        <LinearGradient colors={[COLORS.headerSurface, '#F4F9FF', COLORS.surface]} style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="返回我的页面" onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={23} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>资产管理</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.balanceBlock}>
            <Text style={styles.balanceLabel}>总资产</Text>
            {loading ? <ActivityIndicator color={COLORS.text} style={styles.loading} /> : (
              <Text style={styles.balanceText} numberOfLines={1} adjustsFontSizeToFit>{loadError ? '¥ --' : `¥${formatAmount(total)}`}</Text>
            )}
            <View style={styles.totalCaption}>
              <Ionicons name="layers-outline" size={13} color={COLORS.textSecondary} />
              <Text style={styles.totalCaptionText}>{loadError ? '加载失败，请重试' : `${accounts.length} 个账户 · 当前余额合计`}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>我的账户</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="添加资产账户" onPress={() => setEditing(null)}
            disabled={loading || loadError || deleting !== null} style={styles.addSmall}>
            <Ionicons name="add" size={17} color={COLORS.text} />
            <Text style={styles.addSmallText}>添加账户</Text>
          </TouchableOpacity>
        </View>

        {loadError ? (
          <TouchableOpacity accessibilityRole="button" onPress={() => { setLoading(true); void load(); }} style={styles.emptyCard}>
            <Ionicons name="refresh-outline" size={30} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>账户加载失败</Text>
            <Text style={styles.caption}>点击重试</Text>
          </TouchableOpacity>
        ) : !loading && accounts.length === 0 ? (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="添加第一个账户" onPress={() => setEditing(null)} style={styles.emptyCard}>
            <View style={styles.emptyIcons}>
              <AssetAccountIcon provider="cmb" /><AssetAccountIcon provider="wechat" /><AssetAccountIcon provider="alipay" />
            </View>
            <Text style={styles.emptyTitle}>把分散的钱，放在一起看</Text>
            <Text style={styles.caption}>添加银行卡、微信或现金，轻松掌握总资产</Text>
            <View style={styles.emptyAction}><Ionicons name="add" size={18} color={COLORS.text} /><Text style={styles.addSmallText}>添加第一个账户</Text></View>
          </TouchableOpacity>
        ) : accounts.map((account) => {
          const provider = getAssetProvider(account.provider);
          return (
            <View key={account.id} style={styles.accountCard}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`编辑账户 ${account.name}`} style={styles.accountMain}
                onPress={() => setEditing(account)} disabled={deleting !== null} activeOpacity={0.7}>
                <AssetAccountIcon provider={account.provider} />
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName} numberOfLines={1}>{account.name}</Text>
                  <Text style={styles.accountType}>{provider.name}</Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color={COLORS.textLight} />
              </TouchableOpacity>
              <View style={styles.accountBottom}>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={`修改${account.name}余额`} onPress={() => setEditing(account)} disabled={deleting !== null} style={styles.balanceButton}>
                  <Text style={styles.accountBalance} numberOfLines={1} adjustsFontSizeToFit>¥{formatAmount(account.balance_cents / 100)}</Text>
                  <Text style={styles.tapHint}>点击修改余额</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={`删除账户 ${account.name}`} disabled={deleting !== null} onPress={() => remove(account)} style={styles.deleteButton}>
                  {deleting === account.id ? <ActivityIndicator size="small" color={COLORS.textLight} /> : <Ionicons name="trash-outline" size={17} color={COLORS.textLight} />}
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
        {!loading && !loadError && <Text style={styles.disclaimer}>总资产为各账户当前余额之和。记账不会自动改变这里的余额，你可以随时手动更新。</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.headerSurface, paddingHorizontal: 18, paddingBottom: 26, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 19, borderWidth: 1, borderColor: COLORS.controlBorder },
  headerSpacer: { width: 38, height: 38 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  balanceBlock: { alignItems: 'center', paddingTop: 20 },
  balanceLabel: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  balanceText: { fontSize: 42, fontWeight: '600', color: COLORS.text, marginTop: 7, maxWidth: '100%' },
  loading: { marginVertical: 20 },
  totalCaption: { flexDirection: 'row', gap: 5, alignItems: 'center', marginTop: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.background },
  totalCaptionText: { fontSize: 11, color: COLORS.textSecondary },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 18, marginTop: 23, marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  addSmall: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, backgroundColor: COLORS.controlSurface, borderWidth: 1, borderColor: COLORS.controlBorder, gap: 3 },
  addSmallText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  accountCard: { marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 20, backgroundColor: COLORS.surface, ...SHADOWS.card },
  accountMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  accountType: { fontSize: 11, color: COLORS.textSecondary, marginTop: 5 },
  accountBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 15, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.divider },
  balanceButton: { flex: 1 },
  accountBalance: { fontSize: 25, fontWeight: '600', color: COLORS.text },
  tapHint: { fontSize: 10, color: COLORS.textSecondary, marginTop: 4 },
  deleteButton: { width: 42, height: 44, alignItems: 'center', justifyContent: 'center' },
  emptyCard: { marginHorizontal: 16, paddingHorizontal: 16, paddingVertical: 30, alignItems: 'center', borderRadius: 20, backgroundColor: COLORS.surface, ...SHADOWS.card },
  emptyIcons: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  emptyTitle: { fontSize: 17, color: COLORS.text, fontWeight: '600', marginVertical: 10 },
  caption: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 19 },
  emptyAction: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.controlSurface, borderWidth: 1, borderColor: COLORS.controlBorder, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 13, marginTop: 22, gap: 5 },
  disclaimer: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', marginTop: 12, paddingHorizontal: 30, lineHeight: 18 },
});
