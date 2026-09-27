import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ImportExportService } from '../services/ImportExportService';
import { AccountBookRepo } from '../repositories/AccountBookRepo';
import { COLORS } from '../utils/constants';
import { showThemedAlert } from '../components/AlertProvider';
import { AssetAccountRepo } from '../repositories/AssetAccountRepo';
import type { AssetAccount } from '../models/AssetAccount';
import AssetAccountPicker from '../components/AssetAccountPicker';
import { getDatabase } from '../db/database';
import { useFocusEffect } from '@react-navigation/native';

export default function ImportExportScreen() {
  const [bookId, setBookId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [assetAccounts, setAssetAccounts] = useState<AssetAccount[]>([]);
  const [trackingStartDate, setTrackingStartDate] = useState<string | null>(null);
  const [selectedAssetAccountId, setSelectedAssetAccountId] = useState<number | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    void (async () => {
      const [books, status, accounts] = await Promise.all([
        AccountBookRepo.getAll(), AssetAccountRepo.getTrackingStatus(), AssetAccountRepo.getAll(),
      ]);
      if (!active) return;
      if (books.length > 0) setBookId(books[0].id);
      setTrackingStartDate(status?.startDate ?? null);
      setAssetAccounts(accounts);
      setSelectedAssetAccountId((current) => accounts.some((account) => account.id === current) ? current : accounts[0]?.id ?? null);
    })().catch((error) => console.warn('加载导入账户失败:', error));
    return () => { active = false; };
  }, []));

  const wrap = async (fn: () => Promise<void>) => {
    if (!bookId) return;
    setLoading(true);
    try { await fn(); }
    catch (e: any) { showThemedAlert('操作失败', e.message); }
    finally { setLoading(false); }
  };

  const importIntoAccount = async (importFile: () => Promise<{ imported: number; skipped: number }>) => {
    const status = await AssetAccountRepo.getTrackingStatus();
    if (status && (!selectedAssetAccountId || !(await AssetAccountRepo.getAll()).some((account) => account.id === selectedAssetAccountId))) {
      throw new Error('请先选择导入记录对应的资产账户');
    }
    const db = await getDatabase();
    const before = await db.getFirstAsync<{ id: number }>('SELECT COALESCE(MAX(id), 0) AS id FROM transactions');
    const result = await importFile();
    if (status && selectedAssetAccountId) {
      await db.runAsync('UPDATE transactions SET asset_account_id = ? WHERE id > ? AND date >= ?',
        [selectedAssetAccountId, before?.id ?? 0, status.startDate]);
    }
    showThemedAlert('导入完成', `成功导入 ${result.imported} 条，跳过 ${result.skipped} 条`);
  };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>导出账本</Text>
        <Text style={styles.desc}>将当前账本的数据导出为文件</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.exportBtn} onPress={() => wrap(async () => {
            await ImportExportService.exportToJson(bookId!);
            showThemedAlert('导出成功', '账本已导出为 JSON 文件');
          })}>
            <Ionicons name="document-text-outline" size={20} color="#fff" />
            <Text style={styles.btnText}>导出 JSON</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportBtn} onPress={() => wrap(async () => {
            await ImportExportService.exportToCsv(bookId!);
            showThemedAlert('导出成功', '账本已导出为 CSV 文件');
          })}>
            <Ionicons name="grid-outline" size={20} color="#fff" />
            <Text style={styles.btnText}>导出 CSV</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>导入账本</Text>
        <Text style={styles.desc}>从 JSON 或 CSV 文件导入记录</Text>
        {trackingStartDate && (
          <AssetAccountPicker accounts={assetAccounts} selectedId={selectedAssetAccountId} onSelect={setSelectedAssetAccountId} label="导入到" />
        )}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.importBtn} onPress={() => wrap(async () => {
            await importIntoAccount(() => ImportExportService.importFromJson(bookId!));
          })}>
            <Ionicons name="folder-open-outline" size={20} color="#fff" />
            <Text style={styles.btnText}>导入 JSON</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.importBtn} onPress={() => wrap(async () => {
            await importIntoAccount(() => ImportExportService.importFromCsv(bookId!));
          })}>
            <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
            <Text style={styles.btnText}>导入 CSV</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16, paddingBottom: 48 },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  desc: { fontSize: 13, color: COLORS.textLight, marginBottom: 16 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  exportBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 12,
    gap: 8,
  },
  importBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.text,
    paddingVertical: 18,
    borderRadius: 12,
    gap: 8,
  },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
