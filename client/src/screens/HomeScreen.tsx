import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Button, Card, ListItem, Avatar } from 'react-native-elements';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import apiService from '../services/apiService';
import { Transaction, TransactionStats, User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/currency';

const HomeScreen = ({ navigation }: any) => {
  const { user, logout } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Reload data when screen comes into focus (but not on initial load)
  useFocusEffect(
    useCallback(() => {
      if (!initialLoad) {
        loadDashboardData();
      }
      setInitialLoad(false);
    }, [initialLoad])
  );

  const loadDashboardData = async (isRefreshing = false) => {
    try {
      if (initialLoad) {
        setIsLoading(true);
      } else if (isRefreshing) {
        setRefreshing(true);
      }
      
      const [transactionsResponse, statsResponse] = await Promise.all([
        apiService.getTransactions({ limit: 10, page: 1 }),
        apiService.getTransactionStats(),
      ]);

      setTransactions(transactionsResponse.transactions);
      setStats(statsResponse);
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    loadDashboardData(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH');
  };

  const getTransactionIcon = (type: string, category: string) => {
    if (type === 'income') {
      return { name: 'arrow-upward', color: '#28A745' };
    }
    // For expenses, could customize based on category
    return { name: 'arrow-downward', color: '#DC3545' };
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <ListItem key={item.id.toString()} bottomDivider>
      <Avatar
        icon={getTransactionIcon(item.type, item.category)}
        containerStyle={{
          backgroundColor: item.type === 'income' ? '#E8F5E8' : '#FFE8E8',
        }}
      />
      <ListItem.Content>
        <ListItem.Title>{item.category}</ListItem.Title>
        <ListItem.Subtitle>
          {item.note} • {formatDate(item.date)}
        </ListItem.Subtitle>
      </ListItem.Content>
      <Text
        style={[
          styles.amount,
          { color: item.type === 'income' ? '#28A745' : '#DC3545' },
        ]}
      >
        {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
      </Text>
    </ListItem>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>สวัสดี, {user?.name}!</Text>
          <Text style={styles.subGreeting}>ยินดีต้อนรับกลับ</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={styles.settingsButton}
        >
          <Feather name="settings" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Main Balance Card */}
      {stats && (
        <View style={styles.mainBalanceContainer}>
          <View style={styles.mainBalanceCard}>
            <View style={styles.balanceHeader}>
              <View>
                <Text style={styles.balanceAmount}>
                  {formatCurrency(stats.summary.balance)}
                </Text>
                <Text style={styles.balanceLabel}>ยอดคงเหลือ</Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('Charts')}
                style={styles.chartIconButton}
              >
                <Feather name="pie-chart" size={24} color="#4285F4" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Income and Expense Cards */}
          <View style={styles.incomeExpenseContainer}>
            <View style={[styles.incomeExpenseCard, styles.incomeCardBg]}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardLabel}>รายรับ</Text>
                  <Text style={styles.cardAmount}>
                    {formatCurrency(stats.summary.totalIncome)}
                  </Text>
                </View>
                <Feather name="trending-up" size={20} color="#28A745" />
              </View>
            </View>
            <View style={[styles.incomeExpenseCard, styles.expenseCardBg]}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardLabel}>รายจ่าย</Text>
                  <Text style={styles.cardAmount}>
                    {formatCurrency(stats.summary.totalExpense)}
                  </Text>
                </View>
                <Feather name="trending-down" size={20} color="#DC3545" />
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Recent Transactions */}
      <View style={styles.transactionsContainer}>
        <View style={styles.transactionsHeader}>
          <Text style={styles.sectionTitle}>รายการล่าสุด</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('TransactionHistory')}
            style={styles.viewAllButton}
          >
            <Text style={styles.viewAllText}>ดูทั้งหมด</Text>
            <Feather name="chevron-right" size={16} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          style={styles.transactionsList}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Add Transaction Button */}
      <View style={styles.fabContainer}>
        <Button
          title="+ เพิ่มรายการ"
          onPress={() => navigation.navigate('AddTransaction')}
          buttonStyle={styles.fab}
          titleStyle={styles.fabText}
        />
      </View>
    </View>
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
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  greeting: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  subGreeting: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
  },
  settingsButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 15,
  },
  statCard: {
    flex: 1,
    margin: 5,
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  incomeCard: {
    backgroundColor: '#E8F5E8',
  },
  expenseCard: {
    backgroundColor: '#FFE8E8',
  },
  balanceCard: {
    backgroundColor: '#E8F4FD',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  incomeText: {
    color: '#28A745',
  },
  expenseText: {
    color: '#DC3545',
  },
  transactionsContainer: {
    flex: 1,
    backgroundColor: 'white',
    marginHorizontal: 10,
    borderRadius: 12,
    marginBottom: 100,
  },
  transactionsHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: '#007AFF',
    marginRight: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  transactionsList: {
    flex: 1,
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    left: 20,
    paddingBottom: 20,
  },
  fab: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    paddingVertical: 15,
  },
  fabText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  // New styles for main balance design
  mainBalanceContainer: {
    padding: 20,
    paddingTop: 30,
  },
  mainBalanceCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#666',
  },
  incomeExpenseContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  incomeExpenseCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  incomeCardBg: {
    backgroundColor: '#4ade80', // Green
  },
  expenseCardBg: {
    backgroundColor: '#f87171', // Red
  },
  cardLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
    marginBottom: 8,
  },
  cardAmount: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  chartIconButton: {
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
    borderRadius: 20,
    padding: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
});

export default HomeScreen;