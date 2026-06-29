// ⚠️ 关键代码锁（受 PROJECT_NOTES.md #1 + #4 保护 - Lock-2）
// 1. Tab 配置禁止修改，否则会强制跳转到明细页
// 2. Tab Bar 必须使用自定义 tabBarButton，禁用涟漪效果
// 禁止修改：除非更新 PROJECT_NOTES.md 并记录原因
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PlatformPressable } from '@react-navigation/elements';

import HomeScreen from '../screens/HomeScreen';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import CategoryScreen from '../screens/CategoryScreen';
import StatisticsScreen from '../screens/StatisticsScreen';
import ImportExportScreen from '../screens/ImportExportScreen';
import VoiceInputScreen from '../screens/VoiceInputScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import BudgetScreen from '../screens/BudgetScreen';
import BillStatisticsScreen from '../screens/BillStatisticsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import CategoryDetailScreen from '../screens/CategoryDetailScreen';
import { COLORS } from '../utils/constants';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#B7A892',
        tabBarStyle: [styles.tabBar, { height: 62 + (insets.bottom || 0), paddingBottom: (insets.bottom || 6) }],
        tabBarLabelStyle: styles.tabLabel,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: '明细',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={22} color={color} />
          ),
          tabBarButton: (props) => (
            <PlatformPressable {...props} android_ripple={{ color: 'transparent', borderless: false }} />
          ),
        }}
      />
      <Tab.Screen
        name="Statistics"
        component={StatisticsScreen}
        options={{
          tabBarLabel: '图表',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'pie-chart' : 'pie-chart-outline'} size={22} color={color} />
          ),
          tabBarButton: (props) => (
            <PlatformPressable {...props} android_ripple={{ color: 'transparent', borderless: false }} />
          ),
        }}
      />
      <Tab.Screen
        name="AddTab"
        component={() => null}
        options={{
          tabBarLabel: '',
          tabBarButton: (props) => (
            <TouchableOpacity
              style={styles.centerBtnWrap}
              activeOpacity={0.85}
              onPress={props.onPress}
            >
              <View style={styles.centerBtn}>
                <Ionicons name="add" size={30} color="#fff" />
              </View>
            </TouchableOpacity>
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => { e.preventDefault(); navigation.navigate('AddTransaction'); },
        })}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{
          tabBarLabel: '语音',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'mic' : 'mic-outline'} size={22} color={color} />
          ),
          tabBarButton: (props) => (
            <PlatformPressable {...props} android_ripple={{ color: 'transparent', borderless: false }} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: '我的',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
          tabBarButton: (props) => (
            <PlatformPressable {...props} android_ripple={{ color: 'transparent', borderless: false }} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="MainTabs" component={HomeTabs} options={{ headerShown: false }} />
      <Stack.Screen name="AddTransaction" component={AddTransactionScreen} options={{ headerShown: false, animation: 'slide_from_bottom' }} />
      <Stack.Screen name="VoiceInput" component={VoiceInputScreen} options={{ title: '语音记账' }} />
      <Stack.Screen name="ImportExport" component={ImportExportScreen} options={{ title: '导入导出' }} />
      <Stack.Screen
        name="Category"
        component={CategoryScreen}
        options={{ title: '分类管理', headerStyle: { backgroundColor: COLORS.primary }, headerTintColor: COLORS.text }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: '设置', headerStyle: { backgroundColor: COLORS.primary }, headerTintColor: COLORS.text }}
      />
      <Stack.Screen
        name="Budget"
        component={BudgetScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BillStatistics"
        component={BillStatisticsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CategoryDetail"
        component={CategoryDetailScreen}
        options={{ title: '分类详情', headerTitleStyle: { fontWeight: '600', fontSize: 16 } }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 62,
    paddingBottom: 6,
    paddingTop: 6,
    backgroundColor: COLORS.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.divider,
  },
  tabLabel: { fontSize: 10, marginTop: -1, fontWeight: '600' },
  centerBtnWrap: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#FFF4D3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
  },
});
