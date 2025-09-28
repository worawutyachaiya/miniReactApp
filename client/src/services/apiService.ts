import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Transaction, AuthResponse, TransactionStats } from '../types';

const BASE_URL = 'http://192.168.1.107:4000/api';

class ApiService {
  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  private async getAuthHeaders() {
    const token = await this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  // Auth Methods
  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const data = await response.json();
    await AsyncStorage.setItem('authToken', data.token);
    return data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    await AsyncStorage.setItem('authToken', data.token);
    return data;
  }

  async logout(): Promise<void> {
    await AsyncStorage.removeItem('authToken');
  }

  async getProfile(): Promise<{ user: User }> {
    const response = await fetch(`${BASE_URL}/auth/profile`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get profile');
    }

    return await response.json();
  }

  // Transaction Methods
  async getTransactions(params?: {
    type?: 'income' | 'expense';
    category?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    page?: number;
  }): Promise<{
    transactions: Transaction[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const response = await fetch(
      `${BASE_URL}/transactions?${searchParams.toString()}`,
      {
        headers: await this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get transactions');
    }

    return await response.json();
  }

  async createTransaction(transaction: {
    type: 'income' | 'expense';
    amount: number;
    category: string;
    note?: string;
    date?: string;
  }): Promise<{ message: string; transaction: Transaction }> {
    const response = await fetch(`${BASE_URL}/transactions`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(transaction),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create transaction');
    }

    return await response.json();
  }

  async updateTransaction(
    id: number,
    updates: {
      type?: 'income' | 'expense';
      amount?: number;
      category?: string;
      note?: string;
      date?: string;
    }
  ): Promise<{ message: string; transaction: Transaction }> {
    const response = await fetch(`${BASE_URL}/transactions/${id}`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update transaction');
    }

    return await response.json();
  }

  async deleteTransaction(id: number): Promise<{ message: string }> {
    const response = await fetch(`${BASE_URL}/transactions/${id}`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete transaction');
    }

    return await response.json();
  }

  async getTransactionStats(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<TransactionStats> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const response = await fetch(
      `${BASE_URL}/transactions/stats?${searchParams.toString()}`,
      {
        headers: await this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get transaction stats');
    }

    return await response.json();
  }

  // Profile Methods
  async updateProfile(profileData: { name: string; email: string }): Promise<{ success: boolean; message?: string; user?: User }> {
    try {
      const response = await fetch(`${BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(profileData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, message: data.error || 'Failed to update profile' };
      }

      return { success: true, user: data.user };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, message: 'Network error occurred' };
    }
  }

  async changePassword(passwordData: { currentPassword: string; newPassword: string }): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await fetch(`${BASE_URL}/auth/change-password`, {
        method: 'PUT',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(passwordData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, message: data.error || 'Failed to change password' };
      }

      return { success: true, message: data.message };
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, message: 'Network error occurred' };
    }
  }

  async clearAllData(): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await fetch(`${BASE_URL}/auth/clear-all-data`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders(),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, message: data.error || 'Failed to clear data' };
      }

      return { success: true, message: data.message };
    } catch (error) {
      console.error('Clear all data error:', error);
      return { success: false, message: 'Network error occurred' };
    }
  }
}

export default new ApiService();