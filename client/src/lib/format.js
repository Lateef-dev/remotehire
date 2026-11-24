const LABELS = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
  junior: 'Junior',
  mid: 'Mid-level',
  senior: 'Senior',
  lead: 'Lead',
  worldwide: 'Worldwide',
  africa: 'Africa',
  europe: 'Europe',
  americas: 'Americas',
  'asia-pacific': 'Asia-Pacific',
  emea: 'EMEA',
  submitted: 'Submitted',
  reviewing: 'In review',
  shortlisted: 'Shortlisted',
  rejected: 'Not selected',
  hired: 'Hired',
  open: 'Open',
  closed: 'Closed',
};

export const label = (value) => LABELS[value] ?? value;

const compact = (n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

export function formatSalary({ salaryMin, salaryMax, currency = 'USD' }) {
  const symbol = { USD: '$', EUR: '€', GBP: '£', NGN: '₦' }[currency] ?? `${currency} `;
  if (salaryMin && salaryMax) return `${symbol}${compact(salaryMin)} – ${symbol}${compact(salaryMax)}`;
  if (salaryMax) return `Up to ${symbol}${compact(salaryMax)}`;
  if (salaryMin) return `From ${symbol}${compact(salaryMin)}`;
  return null;
}

export function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  const units = [
    ['y', 31536000],
    ['mo', 2592000],
    ['w', 604800],
    ['d', 86400],
    ['h', 3600],
    ['m', 60],
  ];
  for (const [unit, size] of units) {
    if (seconds >= size) return `${Math.floor(seconds / size)}${unit} ago`;
  }
  return 'just now';
}

export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const data = error?.data?.error;
  if (!data) return fallback;
  if (data.details?.length) return data.details.map((d) => `${d.path ? `${d.path}: ` : ''}${d.message}`).join(' · ');
  return data.message ?? fallback;
}

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
