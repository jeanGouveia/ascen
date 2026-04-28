export const CATEGORIES = [
  { name: 'Alimentação', icon: '🛒', color: '#F97316', type: 'expense' },
  { name: 'Moradia', icon: '🏠', color: '#8B5CF6', type: 'expense' },
  { name: 'Saúde', icon: '💊', color: '#EF4444', type: 'expense' },
  { name: 'Lazer', icon: '📺', color: '#06B6D4', type: 'expense' },
  { name: 'Transporte', icon: '🚗', color: '#F59E0B', type: 'expense' },
  { name: 'Vestuário', icon: '👗', color: '#EC4899', type: 'expense' },
  { name: 'Educação', icon: '📚', color: '#6366F1', type: 'expense' },
  { name: 'Salário', icon: '💰', color: '#16A34A', type: 'income' },
  { name: 'Aluguel', icon: '🏢', color: '#16A34A', type: 'income' },
  { name: 'Outros', icon: '📦', color: '#6B7897', type: 'both' },
] as const;

export const PAYMENT_METHODS = [
  'Pix',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Dinheiro',
  'Transferência',
  'Débito automático',
];
