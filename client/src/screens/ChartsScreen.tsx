import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import apiService from '../services/apiService';
import { formatCurrency } from '../utils/currency';

const { width } = Dimensions.get('window');
const chartWidth = width - 48; // เพิ่ม padding เพื่อไม่ให้ล้นหน้าจอ

interface MonthData {
  month: string;
  income: number;
  expense: number;
}

interface ChartData {
  categories: {
    name: string;
    population: number;
    color: string;
    legendFontColor: string;
    legendFontSize: number;
  }[];
  monthlyData: {
    labels: string[];
    datasets: {
      data: number[];
      color: (opacity?: number) => string;
    }[];
  };
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
  };
}

const ChartsScreen = ({ navigation }: any) => {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('thisMonth');
  
  // Date filter states
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)));
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  
  // Transaction type filter
  const [selectedTransactionType, setSelectedTransactionType] = useState<'income' | 'expense'>('expense');

  useEffect(() => {
    loadChartData();
  }, [selectedPeriod, startDate, endDate, selectedTransactionType]);

  const loadChartData = async () => {
    try {
      setIsLoading(true);
      const stats = await apiService.getTransactionStats();
      const transactions = await apiService.getTransactions({ 
        limit: 1000, 
        page: 1 
      });

      // Filter transactions by date range
      const filteredTransactions = transactions.transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate >= startDate && transactionDate <= endDate;
      });

      // Process data for pie chart (categories) - filtered by date and type
      const categoryData: { [key: string]: number } = {};
      const filteredByTypeTransactions = filteredTransactions.filter(t => t.type === selectedTransactionType);
      
      filteredByTypeTransactions.forEach(transaction => {
        if (categoryData[transaction.category]) {
          categoryData[transaction.category] += transaction.amount;
        } else {
          categoryData[transaction.category] = transaction.amount;
        }
      });

      const colors = ['#4285F4', '#FDD835', '#FF7043', '#66BB6A', '#AB47BC', '#FF5722'];
      const pieChartData = Object.entries(categoryData).map(([category, amount], index) => ({
        name: category,
        population: amount,
        color: colors[index % colors.length],
        legendFontColor: '#333',
        legendFontSize: 14,
      }));

      // Process data for bar chart (filtered transactions within date range)
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
      let monthlyData: MonthData[] = [];

      if (daysDiff <= 90) {
        // If range is 3 months or less, show weekly data
        const weeks: MonthData[] = [];
        const startWeek = new Date(startDate);
        startWeek.setDate(startWeek.getDate() - startWeek.getDay()); // Start of week

        for (let i = 0; i < Math.ceil(daysDiff / 7) + 1; i++) {
          const weekStart = new Date(startWeek);
          weekStart.setDate(weekStart.getDate() + (i * 7));
          weeks.push({
            month: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
            income: 0,
            expense: 0,
          });
        }

        filteredTransactions.forEach(transaction => {
          const transactionDate = new Date(transaction.date);
          const weekIndex = Math.floor((transactionDate.getTime() - startWeek.getTime()) / (1000 * 3600 * 24 * 7));
          
          if (weekIndex >= 0 && weekIndex < weeks.length) {
            if (transaction.type === 'income') {
              weeks[weekIndex].income += transaction.amount;
            } else {
              weeks[weekIndex].expense += transaction.amount;
            }
          }
        });
        monthlyData = weeks;
      } else {
        // If range is longer, show monthly data
        const months: MonthData[] = [];
        const startMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        
        let currentMonth = new Date(startMonth);
        while (currentMonth <= endMonth) {
          months.push({
            month: currentMonth.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' }),
            income: 0,
            expense: 0,
          });
          currentMonth.setMonth(currentMonth.getMonth() + 1);
        }

        filteredTransactions.forEach(transaction => {
          const transactionDate = new Date(transaction.date);
          const monthIndex = months.findIndex(m => {
            const monthStart = new Date(startMonth);
            monthStart.setMonth(monthStart.getMonth() + months.indexOf(m));
            return transactionDate.getMonth() === monthStart.getMonth() && 
                   transactionDate.getFullYear() === monthStart.getFullYear();
          });

          if (monthIndex !== -1) {
            if (transaction.type === 'income') {
              months[monthIndex].income += transaction.amount;
            } else {
              months[monthIndex].expense += transaction.amount;
            }
          }
        });
        monthlyData = months;
      }

      const barChartData = {
        labels: monthlyData.map(m => m.month),
        datasets: [{
          data: selectedTransactionType === 'income' 
            ? monthlyData.map(m => m.income) 
            : monthlyData.map(m => m.expense),
          color: (opacity = 1) => selectedTransactionType === 'income' 
            ? `rgba(40, 167, 69, ${opacity})` 
            : `rgba(255, 99, 132, ${opacity})`,
        }],
      };

      // Calculate filtered summary
      const filteredSummary = {
        totalIncome: filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        totalExpense: filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
        balance: 0, // Will be calculated
      };
      filteredSummary.balance = filteredSummary.totalIncome - filteredSummary.totalExpense;

      setChartData({
        categories: pieChartData,
        monthlyData: barChartData,
        summary: filteredSummary,
      });
    } catch (error: any) {
      console.error('Error loading chart data:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลกราฟได้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('th-TH');
  };

  const setPresetPeriod = (period: string) => {
    const today = new Date();
    switch (period) {
      case 'thisWeek':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        setStartDate(startOfWeek);
        setEndDate(today);
        break;
      case 'thisMonth':
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(startOfMonth);
        setEndDate(today);
        break;
      case 'last3Months':
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(today.getMonth() - 3);
        setStartDate(threeMonthsAgo);
        setEndDate(today);
        break;
      case 'thisYear':
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        setStartDate(startOfYear);
        setEndDate(today);
        break;
    }
    setShowDateFilter(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>กำลังโหลดข้อมูลกราฟ...</Text>
      </View>
    );
  }

  if (!chartData) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-circle" size={48} color="#FF5722" />
        <Text style={styles.errorText}>ไม่สามารถโหลดข้อมูลได้</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadChartData}>
          <Text style={styles.retryText}>ลองใหม่</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>แสดงผล</Text>
        <TouchableOpacity 
          onPress={() => setShowDateFilter(true)}
          style={styles.filterButton}
        >
          <Feather name="filter" size={24} color="#4285F4" />
        </TouchableOpacity>
      </View>

      {/* Date Filter Display */}
      <View style={styles.dateRangeContainer}>
        <Text style={styles.dateRangeText}>
          {formatDate(startDate)} - {formatDate(endDate)}
        </Text>
      </View>

      {/* Transaction Type Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={[
            styles.toggleButton, 
            selectedTransactionType === 'income' ? styles.toggleButtonActive : styles.toggleButtonInactive
          ]}
          onPress={() => setSelectedTransactionType('income')}
        >
          <Feather 
            name="trending-up" 
            size={16} 
            color={selectedTransactionType === 'income' ? '#fff' : '#28A745'} 
          />
          <Text 
            style={[
              styles.toggleText, 
              selectedTransactionType === 'income' ? styles.toggleTextActive : styles.toggleTextInactive
            ]}
          >
            รายรับ
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.toggleButton, 
            selectedTransactionType === 'expense' ? styles.toggleButtonActive : styles.toggleButtonInactive
          ]}
          onPress={() => setSelectedTransactionType('expense')}
        >
          <Feather 
            name="trending-down" 
            size={16} 
            color={selectedTransactionType === 'expense' ? '#fff' : '#DC3545'} 
          />
          <Text 
            style={[
              styles.toggleText, 
              selectedTransactionType === 'expense' ? styles.toggleTextActive : styles.toggleTextInactive
            ]}
          >
            รายจ่าย
          </Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, styles.incomeCard]}>
          <Feather name="trending-up" size={24} color="#28A745" />
          <Text style={styles.summaryLabel}>รายรับ</Text>
          <Text style={[styles.summaryAmount, { color: '#28A745' }]}>
            {formatCurrency(chartData.summary.totalIncome)}
          </Text>
        </View>
        <View style={[styles.summaryCard, styles.expenseCard]}>
          <Feather name="trending-down" size={24} color="#DC3545" />
          <Text style={styles.summaryLabel}>รายจ่าย</Text>
          <Text style={[styles.summaryAmount, { color: '#DC3545' }]}>
            {formatCurrency(chartData.summary.totalExpense)}
          </Text>
        </View>
      </View>

      {/* Pie Chart - Categories */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>
          {selectedTransactionType === 'income' ? 'รายรับตามหมวดหมู่' : 'รายจ่ายตามหมวดหมู่'}
        </Text>
        {chartData.categories.length > 0 ? (
          <PieChart
            data={chartData.categories}
            width={chartWidth}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            center={[10, 0]}
          />
        ) : (
          <View style={styles.noDataContainer}>
            <Feather name="pie-chart" size={48} color="#ccc" />
            <Text style={styles.noDataText}>
              {selectedTransactionType === 'income' ? 'ไม่มีข้อมูลรายรับ' : 'ไม่มีข้อมูลรายจ่าย'}
            </Text>
          </View>
        )}
      </View>

      {/* Bar Chart - Filtered Period */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>
          {selectedTransactionType === 'income' ? 'รายรับตามช่วงเวลาที่เลือก' : 'รายจ่ายตามช่วงเวลาที่เลือก'}
        </Text>
        {chartData.monthlyData.datasets[0].data.some(val => val > 0) ? (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chartScrollContainer}
          >
            <BarChart
              data={chartData.monthlyData}
              width={Math.max(chartWidth, chartData.monthlyData.labels.length * 60)} // ปรับความกว้างตามจำนวนเดือน
              height={220}
              yAxisLabel="฿"
              yAxisSuffix=""
              fromZero={true}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForLabels: {
                  fontSize: 11,
                },
                propsForBackgroundLines: {
                  strokeDasharray: "",
                },
                fillShadowGradient: '#FF6384',
                fillShadowGradientOpacity: 1,
              }}
              verticalLabelRotation={0}
              style={styles.chart}
            />
          </ScrollView>
        ) : (
          <View style={styles.noDataContainer}>
            <Feather name="bar-chart-2" size={48} color="#ccc" />
            <Text style={styles.noDataText}>
              {selectedTransactionType === 'income' ? 'ไม่มีข้อมูลรายรับ' : 'ไม่มีข้อมูลรายจ่าย'}
            </Text>
          </View>
        )}
      </View>

      {/* Legend for categories */}
      {chartData.categories.length > 0 && (
        <View style={styles.legendContainer}>
          <Text style={styles.legendTitle}>
            {selectedTransactionType === 'income' ? 'หมวดหมู่รายรับ' : 'หมวดหมู่รายจ่าย'}
          </Text>
          {chartData.categories.map((item) => (
            <View key={item.name} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: item.color }]} />
              <Text style={styles.legendText}>{item.name}</Text>
              <Text style={styles.legendAmount}>{formatCurrency(item.population)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Date Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showDateFilter}
        onRequestClose={() => setShowDateFilter(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>เลือกช่วงเวลา</Text>
              <TouchableOpacity onPress={() => setShowDateFilter(false)}>
                <Feather name="x" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Preset Periods */}
            <View style={styles.presetContainer}>
              <TouchableOpacity style={styles.presetButton} onPress={() => setPresetPeriod('thisWeek')}>
                <Text style={styles.presetButtonText}>สัปดาห์นี้</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.presetButton} onPress={() => setPresetPeriod('thisMonth')}>
                <Text style={styles.presetButtonText}>เดือนนี้</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.presetButton} onPress={() => setPresetPeriod('last3Months')}>
                <Text style={styles.presetButtonText}>3 เดือนที่ผ่านมา</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.presetButton} onPress={() => setPresetPeriod('thisYear')}>
                <Text style={styles.presetButtonText}>ปีนี้</Text>
              </TouchableOpacity>
            </View>

            {/* Custom Date Range */}
            <View style={styles.customDateContainer}>
              <Text style={styles.customDateTitle}>กำหนดช่วงเวลาเอง</Text>
              
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>จาก:</Text>
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartDatePicker(true)}>
                  <Text style={styles.dateButtonText}>{formatDate(startDate)}</Text>
                  <Feather name="calendar" size={16} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>ถึง:</Text>
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndDatePicker(true)}>
                  <Text style={styles.dateButtonText}>{formatDate(endDate)}</Text>
                  <Feather name="calendar" size={16} color="#666" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.applyButton}
                onPress={() => setShowDateFilter(false)}
              >
                <Text style={styles.applyButtonText}>ใช้งาน</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onChange={handleStartDateChange}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="default"
          onChange={handleEndDateChange}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    marginBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#4285F4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  incomeCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#28A745',
  },
  expenseCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#DC3545',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden', // ป้องกันเนื้อหาล้นออกนอก container
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartScrollContainer: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  noDataContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noDataText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
  },
  legendContainer: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  legendText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  legendAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  // Date filter styles
  filterButton: {
    padding: 4,
  },
  dateRangeContainer: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateRangeText: {
    fontSize: 14,
    color: '#4285F4',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  presetContainer: {
    gap: 12,
    marginBottom: 20,
  },
  presetButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  presetButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  customDateContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 20,
  },
  customDateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 16,
    color: '#333',
    width: 50,
  },
  dateButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  applyButton: {
    backgroundColor: '#4285F4',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  // Toggle container styles
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 8,
    borderRadius: 25,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#4285F4',
  },
  toggleButtonInactive: {
    backgroundColor: 'transparent',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#fff',
  },
  toggleTextInactive: {
    color: '#666',
  },
});

export default ChartsScreen;