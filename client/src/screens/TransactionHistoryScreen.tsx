import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ListItem, Avatar } from 'react-native-elements';
import DateTimePicker from '@react-native-community/datetimepicker';
import apiService from '../services/apiService';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/currency';

const TransactionHistoryScreen = ({ navigation }: any) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [showDateModal, setShowDateModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  // Category filter states
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  
  // UI states
  const [showFilters, setShowFilters] = useState(false);
  
  // Delete states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Context menu states
  const [showContextMenu, setShowContextMenuModal] = useState(false);
  const [contextMenuItem, setContextMenuItem] = useState<Transaction | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [])
  );

  const loadTransactions = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const response = await apiService.getTransactions();
      setTransactions(response.transactions);
      setFilteredTransactions(response.transactions);
      
      // Extract unique categories from transactions
      const categories = [...new Set(response.transactions.map(t => t.category))];
      setAvailableCategories(categories);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    loadTransactions(true);
  };

  // Delete functions
  const handleDeleteRequest = (transaction: Transaction) => {
    setItemToDelete(transaction);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    setIsDeleting(true);
    try {
      await apiService.deleteTransaction(itemToDelete.id);
      setTransactions(prev => prev.filter(t => t.id !== itemToDelete.id));
      setShowDeleteModal(false);
      setItemToDelete(null);
      Alert.alert('สำเร็จ', 'ลบรายการเรียบร้อยแล้ว');
    } catch (error: any) {
      console.error('Error deleting transaction:', error);
      Alert.alert('ผิดพลาด', 'ไม่สามารถลบรายการได้');
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteByCategory = async (category: string) => {
    const transactionsToDelete = transactions.filter(t => t.category === category);
    
    Alert.alert(
      'ยืนยันการลบ',
      `คุณต้องการลบรายการทั้งหมดในหมวดหมู่ "${category}" (${transactionsToDelete.length} รายการ) หรือไม่?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบทั้งหมด',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              // Delete all transactions in the category
              await Promise.all(transactionsToDelete.map(t => apiService.deleteTransaction(t.id)));
              setTransactions(prev => prev.filter(t => t.category !== category));
              Alert.alert('สำเร็จ', `ลบรายการในหมวดหมู่ "${category}" เรียบร้อยแล้ว`);
            } catch (error: any) {
              console.error('Error deleting category:', error);
              Alert.alert('ผิดพลาด', 'ไม่สามารถลบรายการได้');
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  // Context menu functions
  const handleShowContextMenu = (transaction: Transaction) => {
    setContextMenuItem(transaction);
    setShowContextMenuModal(true);
  };

  const handleContextMenuAction = (action: 'delete' | 'deleteCategory') => {
    if (!contextMenuItem) return;
    
    setShowContextMenuModal(false);
    
    if (action === 'delete') {
      handleDeleteRequest(contextMenuItem);
    } else if (action === 'deleteCategory') {
      deleteByCategory(contextMenuItem.category);
    }
    
    setContextMenuItem(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH');
  };

  const getTransactionIcon = (type: string, category: string) => {
    if (type === 'income') {
      return { name: 'arrow-upward', color: '#28A745' };
    }
    return { name: 'arrow-downward', color: '#DC3545' };
  };

  // Filter transactions based on search query and type filter
  useEffect(() => {
    let filtered = transactions;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(transaction => transaction.type === filterType);
    }

    // Filter by categories
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(transaction => 
        selectedCategories.includes(transaction.category)
      );
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      filtered = filtered.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        
        switch (dateFilter) {
          case 'today':
            return transactionDate >= startOfToday;
          case 'week':
            const weekAgo = new Date(startOfToday);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return transactionDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(startOfToday);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return transactionDate >= monthAgo;
          case 'custom':
            if (customStartDate && customEndDate) {
              return transactionDate >= customStartDate && transactionDate <= customEndDate;
            }
            return true;
          default:
            return true;
        }
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(transaction =>
        transaction.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (transaction.note && transaction.note.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredTransactions(filtered);
  }, [transactions, searchQuery, filterType, dateFilter, customStartDate, customEndDate, selectedCategories]);

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <TouchableOpacity
      onLongPress={() => handleShowContextMenu(item)}
      delayLongPress={500}
    >
      <ListItem key={item.id.toString()} bottomDivider>
        <Avatar
          icon={getTransactionIcon(item.type, item.category)}
          containerStyle={{
            backgroundColor: item.type === 'income' ? '#E8F5E8' : '#FFE8E8',
          }}
        />
        <ListItem.Content>
          <ListItem.Title>{item.category}</ListItem.Title>
          <ListItem.Subtitle key={`note-${item.id}`}>{item.note}</ListItem.Subtitle>
          <ListItem.Subtitle key={`date-${item.id}`}>{formatDate(item.date)}</ListItem.Subtitle>
        </ListItem.Content>
        <View style={styles.transactionActions}>
          <Text
            style={[
              styles.amount,
              { color: item.type === 'income' ? '#28A745' : '#DC3545' },
            ]}
          >
            {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
          </Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteRequest(item)}
          >
            <Feather name="x" size={20} color="#dc3545" />
          </TouchableOpacity>
        </View>
      </ListItem>
    </TouchableOpacity>
  );

  const FilterButton = ({ type, title }: { type: 'all' | 'income' | 'expense'; title: string }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filterType === type && styles.filterButtonActive
      ]}
      onPress={() => setFilterType(type)}
    >
      <Text style={[
        styles.filterButtonText,
        filterType === type && styles.filterButtonTextActive
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const DateFilterButton = ({ type, title }: { type: 'all' | 'today' | 'week' | 'month' | 'custom'; title: string }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        dateFilter === type && styles.filterButtonActive
      ]}
      onPress={() => {
        if (type === 'custom') {
          setShowDateModal(true);
        } else {
          setDateFilter(type);
        }
      }}
    >
      <Text style={[
        styles.filterButtonText,
        dateFilter === type && styles.filterButtonTextActive
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const formatDateForDisplay = (date: Date) => {
    return date.toLocaleDateString('th-TH', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleCustomDateFilter = () => {
    if (customStartDate && customEndDate) {
      setDateFilter('custom');
      setShowDateModal(false);
    }
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setCustomStartDate(selectedDate);
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setCustomEndDate(selectedDate);
    }
  };

  // Category filter functions
  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const clearCategoryFilter = () => {
    setSelectedCategories([]);
  };

  const applyCategoryFilter = () => {
    setShowCategoryModal(false);
  };

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
        <Text style={styles.headerTitle}>ประวัติ</Text>
        <TouchableOpacity 
          onPress={() => setShowFilters(!showFilters)}
          style={styles.filterHeaderButton}
        >
          <Feather name="filter" size={24} color={showFilters ? "#4285F4" : "#333"} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="ค้นหารายการ..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Selected Categories Display */}
      {selectedCategories.length > 0 && (
        <View style={styles.selectedCategoriesContainer}>
          <Text style={styles.selectedCategoriesLabel}>หมวดหมู่ที่เลือก:</Text>
          <View style={styles.selectedCategoriesWrapper}>
            {selectedCategories.map((category) => (
              <View key={category} style={styles.selectedCategoryTag}>
                <Text style={styles.selectedCategoryText}>{category}</Text>
                <TouchableOpacity
                  onPress={() => toggleCategory(category)}
                  style={styles.removeCategoryButton}
                >
                  <Feather name="x" size={12} color="#666" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Transaction List */}
      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        style={styles.transactionsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>ไม่พบรายการที่ตรงกับการค้นหา</Text>
          </View>
        }
      />

      {/* Custom Date Filter Modal */}
      <Modal
        visible={showDateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>เลือกช่วงวันที่</Text>
              <TouchableOpacity
                onPress={() => setShowDateModal(false)}
                style={styles.modalCloseButton}
              >
                <Feather name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerRow}>
                <Text style={styles.dateLabel}>วันที่เริ่มต้น:</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text style={styles.dateButtonText}>
                    {customStartDate ? formatDateForDisplay(customStartDate) : 'เลือกวันที่'}
                  </Text>
                  <Feather name="calendar" size={16} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.datePickerRow}>
                <Text style={styles.dateLabel}>วันที่สิ้นสุด:</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Text style={styles.dateButtonText}>
                    {customEndDate ? formatDateForDisplay(customEndDate) : 'เลือกวันที่'}
                  </Text>
                  <Feather name="calendar" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowDateModal(false)}
              >
                <Text style={styles.modalCancelText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handleCustomDateFilter}
              >
                <Text style={styles.modalConfirmText}>ยืนยัน</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={customStartDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onStartDateChange}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={customEndDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onEndDateChange}
        />
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContent}>
            {/* Header */}
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>ตัวกรองข้อมูล</Text>
              <TouchableOpacity
                onPress={() => setShowFilters(false)}
                style={styles.modalCloseButton}
              >
                <Feather name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterModalBody}>
              {/* Transaction Type Section */}
              <View style={styles.filterSection}>
                <View style={styles.filterSectionHeader}>
                  <Feather name="trending-up" size={20} color="#4285F4" />
                  <Text style={styles.filterSectionTitle}>ประเภทรายการ</Text>
                </View>
                <View style={styles.toggleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.toggleOption,
                      filterType === 'all' && styles.toggleOptionActive
                    ]}
                    onPress={() => setFilterType('all')}
                  >
                    <Text style={[
                      styles.toggleOptionText,
                      filterType === 'all' && styles.toggleOptionTextActive
                    ]}>
                      ทั้งหมด
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.toggleOption,
                      filterType === 'income' && styles.toggleOptionActive,
                      filterType === 'income' && styles.incomeOptionActive
                    ]}
                    onPress={() => setFilterType('income')}
                  >
                    <Feather name="trending-up" size={16} color={filterType === 'income' ? '#fff' : '#28A745'} />
                    <Text style={[
                      styles.toggleOptionText,
                      filterType === 'income' && styles.toggleOptionTextActive
                    ]}>
                      รายรับ
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.toggleOption,
                      filterType === 'expense' && styles.toggleOptionActive,
                      filterType === 'expense' && styles.expenseOptionActive
                    ]}
                    onPress={() => setFilterType('expense')}
                  >
                    <Feather name="trending-down" size={16} color={filterType === 'expense' ? '#fff' : '#DC3545'} />
                    <Text style={[
                      styles.toggleOptionText,
                      filterType === 'expense' && styles.toggleOptionTextActive
                    ]}>
                      รายจ่าย
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Date Range Section */}
              <View style={styles.filterSection}>
                <View style={styles.filterSectionHeader}>
                  <Feather name="calendar" size={20} color="#4285F4" />
                  <Text style={styles.filterSectionTitle}>ช่วงเวลา</Text>
                </View>
                <View style={styles.dateFilterGrid}>
                  <TouchableOpacity
                    style={[
                      styles.dateFilterOption,
                      dateFilter === 'all' && styles.dateFilterOptionActive
                    ]}
                    onPress={() => setDateFilter('all')}
                  >
                    <Text style={[
                      styles.dateFilterText,
                      dateFilter === 'all' && styles.dateFilterTextActive
                    ]}>
                      ทั้งหมด
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.dateFilterOption,
                      dateFilter === 'today' && styles.dateFilterOptionActive
                    ]}
                    onPress={() => setDateFilter('today')}
                  >
                    <Text style={[
                      styles.dateFilterText,
                      dateFilter === 'today' && styles.dateFilterTextActive
                    ]}>
                      วันนี้
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.dateFilterOption,
                      dateFilter === 'week' && styles.dateFilterOptionActive
                    ]}
                    onPress={() => setDateFilter('week')}
                  >
                    <Text style={[
                      styles.dateFilterText,
                      dateFilter === 'week' && styles.dateFilterTextActive
                    ]}>
                      7 วัน
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.dateFilterOption,
                      dateFilter === 'month' && styles.dateFilterOptionActive
                    ]}
                    onPress={() => setDateFilter('month')}
                  >
                    <Text style={[
                      styles.dateFilterText,
                      dateFilter === 'month' && styles.dateFilterTextActive
                    ]}>
                      30 วัน
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[
                    styles.customDateButton,
                    dateFilter === 'custom' && styles.customDateButtonActive
                  ]}
                  onPress={() => setShowDateModal(true)}
                >
                  <Feather name="calendar" size={18} color="#666" />
                  <Text style={styles.customDateText}>
                    {dateFilter === 'custom' && customStartDate && customEndDate 
                      ? `${formatDateForDisplay(customStartDate)} - ${formatDateForDisplay(customEndDate)}`
                      : 'กำหนดช่วงวันที่เอง'
                    }
                  </Text>
                  <Feather name="chevron-right" size={18} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Category Section */}
              <View style={styles.filterSection}>
                <View style={styles.filterSectionHeader}>
                  <Feather name="tag" size={20} color="#4285F4" />
                  <Text style={styles.filterSectionTitle}>หมวดหมู่</Text>
                </View>
                <TouchableOpacity
                  style={styles.categorySelectButton}
                  onPress={() => setShowCategoryModal(true)}
                >
                  <View style={styles.categorySelectLeft}>
                    <View style={[
                      styles.categorySelectIcon,
                      selectedCategories.length > 0 && styles.categorySelectIconActive
                    ]}>
                      <Feather 
                        name="tag" 
                        size={16} 
                        color={selectedCategories.length > 0 ? '#fff' : '#666'} 
                      />
                    </View>
                    <View>
                      <Text style={styles.categorySelectTitle}>เลือกหมวดหมู่</Text>
                      <Text style={styles.categorySelectSubtitle}>
                        {selectedCategories.length > 0 
                          ? `เลือกแล้ว ${selectedCategories.length} หมวดหมู่` 
                          : 'แตะเพื่อเลือกหมวดหมู่'
                        }
                      </Text>
                    </View>
                  </View>
                  <Feather name="chevron-right" size={20} color="#666" />
                </TouchableOpacity>
                
                {selectedCategories.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearCategoriesButton}
                    onPress={clearCategoryFilter}
                  >
                    <Feather name="x-circle" size={16} color="#dc3545" />
                    <Text style={styles.clearCategoriesText}>ล้างการเลือกหมวดหมู่</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Footer */}
            <View style={styles.filterModalFooter}>
              <TouchableOpacity
                style={styles.filterModalCloseButton}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.filterModalCloseText}>ปิด</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category Selection Modal */}
      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>เลือกหมวดหมู่</Text>
              <TouchableOpacity
                onPress={() => setShowCategoryModal(false)}
                style={styles.modalCloseButton}
              >
                <Feather name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.categoryContainer}>
              {availableCategories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    selectedCategories.includes(category) && styles.categoryButtonActive
                  ]}
                  onPress={() => toggleCategory(category)}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    selectedCategories.includes(category) && styles.categoryButtonTextActive
                  ]}>
                    {category}
                  </Text>
                  {selectedCategories.includes(category) && (
                    <Feather name="check" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowCategoryModal(false)}
              >
                <Text style={styles.modalCancelText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={applyCategoryFilter}
              >
                <Text style={styles.modalConfirmText}>ยืนยัน</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalHeader}>
              <Feather name="trash-2" size={32} color="#dc3545" />
              <Text style={styles.deleteModalTitle}>ยืนยันการลบ</Text>
              <Text style={styles.deleteModalMessage}>
                คุณต้องการลบรายการนี้หรือไม่?
              </Text>
              {itemToDelete && (
                <View style={styles.deleteItemPreview}>
                  <Text style={styles.deleteItemCategory}>{itemToDelete.category}</Text>
                  <Text style={styles.deleteItemAmount}>
                    {formatCurrency(itemToDelete.amount)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                <Text style={styles.modalCancelText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteConfirmButton]}
                onPress={confirmDelete}
                disabled={isDeleting}
              >
                <Text style={styles.deleteConfirmText}>
                  {isDeleting ? 'กำลังลบ...' : 'ลบ'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Context Menu Modal */}
      <Modal
        visible={showContextMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowContextMenuModal(false)}
      >
        <TouchableOpacity 
          style={styles.contextMenuOverlay}
          activeOpacity={1}
          onPress={() => setShowContextMenuModal(false)}
        >
          <View style={styles.contextMenuContainer}>
            <View style={styles.contextMenuContent}>
              {contextMenuItem && (
                <View style={styles.contextMenuHeader}>
                  <Text style={styles.contextMenuTitle}>{contextMenuItem.category}</Text>
                  <Text style={styles.contextMenuSubtitle}>
                    {formatCurrency(contextMenuItem.amount)}
                  </Text>
                </View>
              )}
              
              <View style={styles.contextMenuButtons}>
                <TouchableOpacity
                  style={styles.contextMenuButton}
                  onPress={() => handleContextMenuAction('delete')}
                >
                  <Feather name="trash-2" size={18} color="#dc3545" />
                  <Text style={styles.contextMenuButtonText}>ลบรายการนี้</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.contextMenuButton}
                  onPress={() => handleContextMenuAction('deleteCategory')}
                >
                  <Feather name="folder-minus" size={18} color="#dc3545" />
                  <Text style={styles.contextMenuButtonText}>ลบทั้งหมวดหมู่</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  filterHeaderButton: {
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    gap: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  filterLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginRight: 5,
    minWidth: 60,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 2,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  transactionsList: {
    flex: 1,
    backgroundColor: '#fff',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
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
  datePickerContainer: {
    marginBottom: 30,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    justifyContent: 'space-between',
  },
  dateLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    flex: 2,
    justifyContent: 'space-between',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#f5f5f5',
  },
  modalConfirmButton: {
    backgroundColor: '#007AFF',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  modalConfirmText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  // Category filter styles
  clearButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  clearButtonText: {
    fontSize: 12,
    color: '#dc3545',
    fontWeight: '500',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 20,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dee2e6',
    gap: 6,
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  // Selected categories display
  selectedCategoriesContainer: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  selectedCategoriesLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginBottom: 8,
  },
  selectedCategoriesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedCategoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  selectedCategoryText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  removeCategoryButton: {
    padding: 2,
  },
  // Filter toggle styles
  filterToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dee2e6',
    marginLeft: 12,
    gap: 6,
  },
  filterToggleText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterToggleTextActive: {
    color: '#007AFF',
  },
  filtersSection: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  // Transaction item styles
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  deleteCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#ffe6e6',
    borderRadius: 12,
    gap: 4,
  },
  deleteCategoryText: {
    fontSize: 11,
    color: '#dc3545',
    fontWeight: '500',
  },
  transactionActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  deleteButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#ffe6e6',
  },
  // Delete modal styles
  deleteModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    maxWidth: 320,
    alignSelf: 'center',
  },
  deleteModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  deleteModalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  deleteItemPreview: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  deleteItemCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  deleteItemAmount: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteConfirmButton: {
    backgroundColor: '#dc3545',
  },
  deleteConfirmText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  
  // Filter Modal Styles
  filterModalContent: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    maxHeight: '85%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterModalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxHeight: '75%',
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 4,
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  toggleOptionActive: {
    backgroundColor: '#4285F4',
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  incomeOptionActive: {
    backgroundColor: '#28A745',
  },
  expenseOptionActive: {
    backgroundColor: '#DC3545',
  },
  toggleOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 4,
  },
  toggleOptionTextActive: {
    color: '#fff',
  },
  dateFilterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dateFilterOption: {
    minWidth: '22%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  dateFilterOptionActive: {
    backgroundColor: '#4285F4',
    borderColor: '#4285F4',
  },
  dateFilterText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  dateFilterTextActive: {
    color: '#fff',
  },
  customDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  customDateButtonActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#4285F4',
  },
  customDateText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginHorizontal: 8,
  },
  categorySelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  categorySelectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categorySelectIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categorySelectIconActive: {
    backgroundColor: '#4285F4',
  },
  categorySelectTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  categorySelectSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  clearCategoriesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 8,
  },
  clearCategoriesText: {
    fontSize: 13,
    color: '#dc3545',
    marginLeft: 4,
  },
  filterModalFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterModalCloseButton: {
    backgroundColor: '#4285F4',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  filterModalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  filterButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterModalButtons: {
    padding: 20,
    paddingTop: 0,
  },
  categorySelectButtonActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196F3',
  },
  categorySelectText: {
    flex: 1,
    color: '#333',
    fontSize: 14,
  },
  clearAllButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearAllText: {
    color: '#dc3545',
    fontSize: 12,
    fontWeight: '500',
  },
  // Context menu styles
  contextMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contextMenuContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 20,
    minWidth: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  contextMenuContent: {
    padding: 0,
  },
  contextMenuHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  contextMenuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  contextMenuSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  contextMenuButtons: {
    padding: 0,
  },
  contextMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  contextMenuButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});

export default TransactionHistoryScreen;