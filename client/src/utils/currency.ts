// Currency formatting utility for Thai Baht
export const formatCurrency = (amount: number): string => {
  return `฿${amount.toLocaleString('th-TH', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

// Format currency without symbol (for input fields)
export const formatAmount = (amount: number): string => {
  return amount.toLocaleString('th-TH', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};

// Parse currency string to number
export const parseCurrency = (currencyString: string): number => {
  return parseFloat(currencyString.replace(/[฿,\s]/g, '')) || 0;
};