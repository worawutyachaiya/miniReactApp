import type { Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createTransaction = async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { type, amount, category, note, date } = req.body;

    if (!type || amount === undefined || !category) {
      return res.status(400).json({ error: 'Type, amount, and category are required' });
    }

    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Type must be either income or expense' });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    const transaction = await prisma.transaction.create({
      data: {
        type,
        amount,
        category,
        note: note || null,
        date: date ? new Date(date) : new Date(),
        userId: req.user.id
      },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });

    res.status(201).json({
      message: 'Transaction created successfully',
      transaction
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTransactions = async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { type, category, startDate, endDate, limit = '10', page = '1' } = req.query;

    const filters: any = {
      userId: req.user.id
    };

    if (type && ['income', 'expense'].includes(type as string)) {
      filters.type = type;
    }

    if (category) {
      filters.category = category;
    }

    if (startDate || endDate) {
      filters.date = {};
      if (startDate) filters.date.gte = new Date(startDate as string);
      if (endDate) filters.date.lte = new Date(endDate as string);
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: filters,
        orderBy: { date: 'desc' },
        skip,
        take: limitNum,
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      }),
      prisma.transaction.count({ where: filters })
    ]);

    res.json({
      transactions,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTransactionById = async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }
    
    const transactionId = parseInt(id);

    if (isNaN(transactionId)) {
      return res.status(400).json({ error: 'Invalid transaction ID' });
    }

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: req.user.id
      },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ transaction });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTransaction = async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }
    
    const transactionId = parseInt(id);

    if (isNaN(transactionId)) {
      return res.status(400).json({ error: 'Invalid transaction ID' });
    }

    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: req.user.id
      }
    });

    if (!existingTransaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const { type, amount, category, note, date } = req.body;

    const updateData: any = {};
    
    if (type !== undefined) {
      if (!['income', 'expense'].includes(type)) {
        return res.status(400).json({ error: 'Type must be either income or expense' });
      }
      updateData.type = type;
    }
    
    if (amount !== undefined) {
      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: 'Amount must be a positive number' });
      }
      updateData.amount = amount;
    }
    
    if (category !== undefined) updateData.category = category;
    if (note !== undefined) updateData.note = note;
    if (date !== undefined) updateData.date = new Date(date);

    const transaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: updateData,
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });

    res.json({
      message: 'Transaction updated successfully',
      transaction
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteTransaction = async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }
    
    const transactionId = parseInt(id);

    if (isNaN(transactionId)) {
      return res.status(400).json({ error: 'Invalid transaction ID' });
    }

    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: req.user.id
      }
    });

    if (!existingTransaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await prisma.transaction.delete({
      where: { id: transactionId }
    });

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTransactionStats = async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { startDate, endDate } = req.query;

    const filters: any = {
      userId: req.user.id
    };

    if (startDate || endDate) {
      filters.date = {};
      if (startDate) filters.date.gte = new Date(startDate as string);
      if (endDate) filters.date.lte = new Date(endDate as string);
    }

    const [incomeStats, expenseStats, categoryStats] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ...filters, type: 'income' },
        _sum: { amount: true },
        _count: true
      }),
      prisma.transaction.aggregate({
        where: { ...filters, type: 'expense' },
        _sum: { amount: true },
        _count: true
      }),
      prisma.transaction.groupBy({
        by: ['category', 'type'],
        where: filters,
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } }
      })
    ]);

    const totalIncome = incomeStats._sum.amount || 0;
    const totalExpense = expenseStats._sum.amount || 0;
    const balance = totalIncome - totalExpense;

    res.json({
      summary: {
        totalIncome,
        totalExpense,
        balance,
        incomeCount: incomeStats._count,
        expenseCount: expenseStats._count
      },
      categoryBreakdown: categoryStats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};