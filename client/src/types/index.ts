export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note?: string;
  date: string;
  userId: number;
  user?: {
    name: string;
    email: string;
  };
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface TransactionStats {
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    incomeCount: number;
    expenseCount: number;
  };
  categoryBreakdown: Array<{
    category: string;
    type: 'income' | 'expense';
    _sum: { amount: number };
    _count: number;
  }>;
}

export interface ApiResponse<T> {
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}