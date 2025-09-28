import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import apiService from '../services/apiService';
import { formatCurrency } from '../utils/currency';

const AddTransactionScreen = ({ navigation, route }: any) => {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    amount?: string;
    category?: string;
  }>({});

  // Category suggestions states
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [filteredCategories, setFilteredCategories] = useState<string[]>([]);

  const typeButtons = ['รายจ่าย', 'รายรับ'];
  const selectedTypeIndex = type === 'expense' ? 0 : 1;

  // Load available categories on component mount
  useEffect(() => {
    loadAvailableCategories();
  }, []);

  const loadAvailableCategories = async () => {
    try {
      const response = await apiService.getTransactions({ limit: 1000, page: 1 });
      const categories = [...new Set(response.transactions.map(t => t.category))];
      setAvailableCategories(categories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  // Filter categories based on input, transaction type, and usage frequency
  useEffect(() => {
    let relevantCategories = availableCategories;
    
    // Optional: You could filter by transaction type if you want
    // For now, we'll show all categories regardless of type
    
    if (category.length > 0) {
      const filtered = relevantCategories.filter(cat =>
        cat.toLowerCase().includes(category.toLowerCase())
      );
      setFilteredCategories(filtered.slice(0, 5)); // Show max 5 suggestions
      setShowCategorySuggestions(filtered.length > 0 && category !== filtered[0]);
    } else {
      // Show recent categories when input is empty
      setFilteredCategories(relevantCategories.slice(0, 8)); // Show max 8 recent
      setShowCategorySuggestions(false);
    }
  }, [category, availableCategories, type]);

  const validateForm = () => {
    const newErrors: { amount?: string; category?: string } = {};

    if (!amount) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(Number(amount)) || Number(amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }

    if (!category.trim()) {
      newErrors.category = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const newTransaction = await apiService.createTransaction({
        type,
        amount: Number(amount),
        category: category.trim(),
        note: note.trim() || undefined,
        date: date.toISOString(),
      });

      Alert.alert('สำเร็จ', 'เพิ่มรายการเรียบร้อยแล้ว', [
        {
          text: 'ตกลง',
          onPress: () => {
            // Clear form
            setAmount('');
            setCategory('');
            setNote('');
            setDate(new Date());
            // Navigate back - useFocusEffect in HomeScreen will refresh data
            navigation.goBack();
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      Alert.alert('ผิดพลาด', error.message || 'ไม่สามารถเพิ่มรายการได้');
    } finally {
      setIsLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('th-TH');
  };

  // Quick amount suggestions
  const quickAmounts = ['50', '100', '200', '500', '1000'];

  // Category selection handlers
  const selectCategory = (selectedCategory: string) => {
    setCategory(selectedCategory);
    setShowCategorySuggestions(false);
  };

  const handleCategoryFocus = () => {
    if (category.length === 0 && availableCategories.length > 0) {
      setFilteredCategories(availableCategories.slice(0, 8));
      setShowCategorySuggestions(true);
    }
  };

  const handleCategoryBlur = () => {
    // Delay hiding suggestions to allow for selection
    setTimeout(() => {
      setShowCategorySuggestions(false);
    }, 150);
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
        <Text style={styles.headerTitle}>เพิ่มรายการ</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          {/* Transaction Type Toggle */}
          <View style={styles.typeContainer}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                styles.expenseButton,
                type === 'expense' && styles.activeExpenseButton,
              ]}
              onPress={() => setType('expense')}
            >
              <Feather 
                name="trending-down" 
                size={20} 
                color={type === 'expense' ? '#fff' : '#DC3545'} 
              />
              <Text style={[
                styles.typeButtonText,
                type === 'expense' ? styles.activeButtonText : styles.inactiveExpenseText
              ]}>
                รายจ่าย
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.typeButton,
                styles.incomeButton,
                type === 'income' && styles.activeIncomeButton,
              ]}
              onPress={() => setType('income')}
            >
              <Feather 
                name="trending-up" 
                size={20} 
                color={type === 'income' ? '#fff' : '#28A745'} 
              />
              <Text style={[
                styles.typeButtonText,
                type === 'income' ? styles.activeButtonText : styles.inactiveIncomeText
              ]}>
                รายรับ
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amount Section */}
          <View style={styles.amountContainer}>
            <Text style={styles.sectionTitle}>จำนวนเงิน</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>฿</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>
            {errors.amount && (
              <Text style={styles.errorText}>{errors.amount}</Text>
            )}
            
            {/* Quick Amount Buttons */}
            <View style={styles.quickAmountContainer}>
              <Text style={styles.quickAmountLabel}>จำนวนด่วน:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.quickAmountButtons}>
                  {quickAmounts.map((quickAmount) => (
                    <TouchableOpacity
                      key={quickAmount}
                      style={styles.quickAmountButton}
                      onPress={() => setAmount(quickAmount)}
                    >
                      <Text style={styles.quickAmountButtonText}>
                        {formatCurrency(Number(quickAmount))}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>

          {/* Category Section */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>หมวดหมู่</Text>
            
            {/* Quick Category Selection */}
            {availableCategories.length > 0 && !showCategorySuggestions && category.length === 0 && (
              <View style={styles.quickCategoryContainer}>
                <Text style={styles.quickCategoryLabel}>หมวดหมู่ที่ใช้ล่าสุด:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.quickCategoryButtons}>
                    {filteredCategories.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.quickCategoryButton,
                          type === 'expense' ? styles.quickCategoryButtonExpense : styles.quickCategoryButtonIncome
                        ]}
                        onPress={() => selectCategory(cat)}
                      >
                        <Text style={[
                          styles.quickCategoryButtonText,
                          type === 'expense' ? styles.quickCategoryButtonTextExpense : styles.quickCategoryButtonTextIncome
                        ]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            <View style={[styles.inputContainer, errors.category && styles.inputError]}>
              <Feather name="tag" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={category}
                onChangeText={setCategory}
                onFocus={handleCategoryFocus}
                onBlur={handleCategoryBlur}
                placeholder="เช่น อาหาร, ขนส่ง, เงินเดือน"
                placeholderTextColor="#999"
              />
            </View>
            
            {/* Category Suggestions Dropdown */}
            {showCategorySuggestions && filteredCategories.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {filteredCategories.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion}
                    style={styles.suggestionItem}
                    onPress={() => selectCategory(suggestion)}
                  >
                    <Feather name="tag" size={16} color="#666" />
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            {errors.category && (
              <Text style={styles.errorText}>{errors.category}</Text>
            )}
          </View>

          {/* Note Section */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>หมายเหตุ (ไม่บังคับ)</Text>
            <View style={styles.inputContainer}>
              <Feather name="edit-3" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, styles.noteInput]}
                value={note}
                onChangeText={setNote}
                placeholder="เพิ่มหมายเหตุ..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Date Section */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>วันที่</Text>
            <TouchableOpacity
              style={styles.dateContainer}
              onPress={() => setShowDatePicker(true)}
            >
              <Feather name="calendar" size={20} color="#666" style={styles.inputIcon} />
              <Text style={styles.dateText}>{formatDate(date)}</Text>
              <Feather name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              type === 'expense' ? styles.expenseSubmitButton : styles.incomeSubmitButton,
              isLoading && styles.disabledButton
            ]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Feather 
              name={type === 'expense' ? 'minus-circle' : 'plus-circle'} 
              size={20} 
              color="#fff" 
            />
            <Text style={styles.submitButtonText}>
              {isLoading ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
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
    width: 32,
  },
  scrollContainer: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  // Type selection
  typeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  expenseButton: {
    borderColor: '#DC3545',
    backgroundColor: 'rgba(220, 53, 69, 0.05)',
  },
  activeExpenseButton: {
    backgroundColor: '#DC3545',
  },
  incomeButton: {
    borderColor: '#28A745',
    backgroundColor: 'rgba(40, 167, 69, 0.05)',
  },
  activeIncomeButton: {
    backgroundColor: '#28A745',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  activeButtonText: {
    color: '#fff',
  },
  inactiveExpenseText: {
    color: '#DC3545',
  },
  inactiveIncomeText: {
    color: '#28A745',
  },
  // Sections
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputSection: {
    marginBottom: 24,
  },
  // Amount input
  amountContainer: {
    marginBottom: 24,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4285F4',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    paddingVertical: 12,
  },
  // Quick amount buttons
  quickAmountContainer: {
    marginTop: 12,
  },
  quickAmountLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  quickAmountButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAmountButton: {
    backgroundColor: '#f0f4ff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
  },
  quickAmountButtonText: {
    fontSize: 14,
    color: '#4285F4',
    fontWeight: '500',
  },
  // Input containers
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputError: {
    borderColor: '#DC3545',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  noteInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#DC3545',
    fontSize: 14,
    marginTop: 4,
  },
  // Date container
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  // Submit button
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 32,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  expenseSubmitButton: {
    backgroundColor: '#DC3545',
  },
  incomeSubmitButton: {
    backgroundColor: '#28A745',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Category suggestions styles
  quickCategoryContainer: {
    marginBottom: 16,
  },
  quickCategoryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginBottom: 8,
  },
  quickCategoryButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 2,
  },
  quickCategoryButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  quickCategoryButtonText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  quickCategoryButtonExpense: {
    borderColor: '#dc3545',
    backgroundColor: '#fce4e6',
  },
  quickCategoryButtonIncome: {
    borderColor: '#28a745',
    backgroundColor: '#e6f7e6',
  },
  quickCategoryButtonTextExpense: {
    color: '#dc3545',
  },
  quickCategoryButtonTextIncome: {
    color: '#28a745',
  },
  suggestionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
    gap: 12,
  },
  suggestionText: {
    fontSize: 16,
    color: '#333',
  },
});

export default AddTransactionScreen;