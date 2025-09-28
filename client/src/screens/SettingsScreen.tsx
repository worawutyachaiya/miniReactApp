import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';

const SettingsScreen = ({ navigation }: any) => {
  const { user, logout } = useAuth();
  const [transactionCount, setTransactionCount] = useState<number | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    loadTransactionStats();
  }, []);

  const loadTransactionStats = async () => {
    try {
      setIsLoadingStats(true);
      const transactions = await apiService.getTransactions({ limit: 1000, page: 1 });
      setTransactionCount(transactions.transactions.length);
    } catch (error) {
      console.error('Error loading transaction stats:', error);
      setTransactionCount(0);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'ออกจากระบบ',
      'คุณแน่ใจหรือไม่ที่ต้องการออกจากระบบ?',
      [
        {
          text: 'ยกเลิก',
          style: 'cancel',
        },
        {
          text: 'ออกจากระบบ',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const handleClearAllData = () => {
    Alert.alert(
      'ล้างข้อมูลทั้งหมด',
      'คำเตือน: การดำเนินการนี้จะลบข้อมูลรายรับ-รายจ่ายทั้งหมดของคุณและไม่สามารถกู้คืนได้\n\nคุณแน่ใจหรือไม่ที่ต้องการเริ่มต้นใหม่?',
      [
        {
          text: 'ยกเลิก',
          style: 'cancel',
        },
        {
          text: 'ยืนยัน ล้างข้อมูล',
          style: 'destructive',
          onPress: confirmClearAllData,
        },
      ]
    );
  };

  const confirmClearAllData = async () => {
    try {
      const result = await apiService.clearAllData();
      
      if (result.success) {
        Alert.alert(
          'สำเร็จ!',
          result.message || 'ล้างข้อมูลทั้งหมดเรียบร้อยแล้ว คุณสามารถเริ่มต้นใหม่ได้เลย',
          [
            {
              text: 'ตกลง',
              onPress: () => {
                // Navigate back to home to refresh data
                navigation.navigate('Home');
                // Reload stats after clearing data
                setTransactionCount(0);
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'เกิดข้อผิดพลาด',
          result.message || 'ไม่สามารถล้างข้อมูลได้ กรุณาลองใหม่อีกครั้ง'
        );
      }
    } catch (error) {
      Alert.alert(
        'เกิดข้อผิดพลาด',
        'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'
      );
    }
  };

  const settingsOptions = [
    {
      id: 'profile',
      title: 'แก้ไขโปรไฟล์',
      icon: 'user' as const,
      onPress: () => {
        navigation.navigate('EditProfile');
      },
    },
    {
      id: 'password',
      title: 'เปลี่ยนรหัสผ่าน',
      icon: 'lock' as const,
      onPress: () => {
        navigation.navigate('ChangePassword');
      },
    },
    {
      id: 'clearData',
      title: 'ล้างข้อมูลทั้งหมด',
      icon: 'trash-2' as const,
      onPress: handleClearAllData,
      isDangerous: true,
    },
    {
      id: 'logout',
      title: 'ออกจากระบบ',
      icon: 'log-out' as const,
      onPress: handleLogout,
      isDangerous: true,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ตั้งค่า</Text>
        <View style={styles.placeholder} />
      </View>

      {/* User Info & Stats */}
      <View style={styles.userInfoContainer}>
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            <Feather name="user" size={32} color="#4285F4" />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>
        
        {/* Transaction Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Feather name="database" size={20} color="#666" />
            <Text style={styles.statLabel}>รายการทั้งหมด</Text>
            {isLoadingStats ? (
              <ActivityIndicator size="small" color="#4285F4" />
            ) : (
              <Text style={styles.statValue}>{transactionCount?.toLocaleString() || '0'} รายการ</Text>
            )}
          </View>
        </View>
      </View>

      {/* Settings Options */}
      <View style={styles.content}>
        {settingsOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={styles.settingItem}
            onPress={option.onPress}
          >
            <View style={styles.settingItemLeft}>
              <View style={[styles.iconContainer, option.isDangerous && styles.dangerousIconContainer]}>
                <Feather 
                  name={option.icon} 
                  size={20} 
                  color={option.isDangerous ? '#f87171' : '#666'} 
                />
              </View>
              <Text style={[styles.settingItemText, option.isDangerous && styles.dangerousText]}>
                {option.title}
              </Text>
            </View>
            {!option.isDangerous && (
              <Feather name="chevron-right" size={20} color="#ccc" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 10,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  dangerousIconContainer: {
    backgroundColor: '#fee2e2',
  },
  settingItemText: {
    fontSize: 16,
    color: '#333',
  },
  dangerousText: {
    color: '#f87171',
  },
  // User info styles
  userInfoContainer: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  statsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
    paddingTop: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4285F4',
  },
});

export default SettingsScreen;