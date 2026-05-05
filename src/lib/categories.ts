import type { Category } from './types';

export const EXPENSE_CATEGORIES: Category[] = [
  { id: 'food',          label: 'Alimentació',   icon: '🛒', color: '#FF9500' },
  { id: 'restaurants',   label: 'Restaurants',   icon: '🍽️', color: '#FF3B30' },
  { id: 'transport',     label: 'Transport',     icon: '🚗', color: '#007AFF' },
  { id: 'entertainment', label: 'Entreteniment', icon: '🎮', color: '#AF52DE' },
  { id: 'clothing',      label: 'Roba',          icon: '👕', color: '#5AC8FA' },
  { id: 'home',          label: 'Llar',          icon: '🏠', color: '#34C759' },
  { id: 'subscriptions', label: 'Subscripcions', icon: '🔄', color: '#5856D6' },
  { id: 'education',     label: 'Educació',      icon: '📚', color: '#FF9500' },
  { id: 'other',         label: 'Altres',        icon: '•',  color: '#8E8E93' },
];

export const INCOME_CATEGORIES: Category[] = [
  { id: 'salary',        label: 'Salari',          icon: '💼', color: '#34C759' },
  { id: 'freelance',     label: 'Freelance',        icon: '💻', color: '#007AFF' },
  { id: 'bizum_in',      label: 'Bizum',            icon: '📱', color: '#5AC8FA' },
  { id: 'transfer_in',   label: 'Transferència',    icon: '🏦', color: '#5856D6' },
  { id: 'gift',          label: 'Regal',            icon: '🎁', color: '#FF9500' },
  { id: 'income_other',  label: 'Altres ingressos', icon: '➕', color: '#8E8E93' },
];

export const EXPENSE_PAYMENT_METHODS = [
  { id: 'card',  label: 'Targeta', icon: '💳', hasAccounts: true  },
  { id: 'cash',  label: 'Efectiu', icon: '💵', hasAccounts: false },
  { id: 'bizum', label: 'Bizum',   icon: '📱', hasAccounts: false },
  { id: 'bank',  label: 'Banc',    icon: '🏦', hasAccounts: true  },
];

export const INCOME_PAYMENT_METHODS = [
  { id: 'transfer', label: 'Transferència', icon: '🏦' },
  { id: 'bizum',    label: 'Bizum',         icon: '📱' },
  { id: 'cash',     label: 'Efectiu',       icon: '💵' },
];

export function getCategoryById(id: string): Category {
  return [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].find(category => category.id === id)
    ?? EXPENSE_CATEGORIES.at(-1)!;
}

// Keyword rules for automatic PDF import categorization
export const PDF_AUTOCATEGORIZATION_RULES: Array<{ pattern: RegExp; categoryId: string }> = [
  { pattern: /MERCADONA|LIDL|ALDI|CARREFOUR|SUPERMA|CONSUM|EROSKI|CONDIS|BONPREU|CAPRABO|SPAR/, categoryId: 'food' },
  { pattern: /BAR |RESTAURANT|SUSHI|PIZZA|MCDON|FRANKFURT|CAFET|BODEGA|TAPAS|KEBAB/, categoryId: 'restaurants' },
  { pattern: /RENFE|METRO |FGC|TMB|RODALIES|CABIFY|UBER |TAXI|REPSOL|CEPSA|GALP|PARKING|PEATGE/, categoryId: 'transport' },
  { pattern: /NETFLIX|SPOTIFY|PRIME|DISNEY|HBO|APPLE\.COM|GOOGLE|MICROSOFT|SUBSCRI|YOUTUBE/, categoryId: 'subscriptions' },
  { pattern: /JOCS|CINE|CINEMA|TEATRO|FNAC|STEAM|PLAYSTATION|XBOX|NINTENDO/, categoryId: 'entertainment' },
  { pattern: /ZARA|H&M|MANGO|PRIMARK|PULL|BERSHKA|STRADIVARIUS|DECATHLON/, categoryId: 'clothing' },
  { pattern: /IKEA|LEROY|BAUHAUS|ENDESA|NATURGY|IBERDROLA|COMUNIDAD|ALQUILER/, categoryId: 'home' },
];
