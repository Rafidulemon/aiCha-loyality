/**
 * What the three apps share about AiCha: the UI types the API adapters produce, AiCha's starting card, and the outlet and
 * offer reference data the seed script loads into an empty database (prisma/seed.ts). Nothing here is customer data: every
 * customer, card, voucher and activity comes from the API. Every user-facing string is a { bn, en } pair.
 */
import type { Text } from './i18n';

const t = (bn: string, en: string): Text => ({ bn, en });

export type Shop = {
  id: string;
  name: Text;
  /** What the card is called, shown on it under the brand name. */
  cardName: Text;
  initial: Text;
  area: Text;
  reward: Text;
  rewardItems: Text[];
  total: number;
  collected: number;
  color: string;
  fg: string;
  /** True for a dark card, which needs light marks instead of dark ones. */
  dark: boolean;
  stampBg: string;
  stampFg: string;
  dash: string;
  deco1: string;
  deco2: string;
};

/** AiCha is the only vendor. This is the starting card; the live one is this with the loyalty program applied (see lib/program.ts). */
export const shop: Shop = {
  id: 'aicha', name: t('আইচা', 'AiCha'), cardName: t('লয়্যালটি কার্ড', 'Loyalty card'), initial: t('আ', 'A'),
  area: t('ডেজার্ট ও চা', 'Ice cream and tea'),
  reward: t('ফ্রি বাবল টি / আইসক্রিম', 'free bubble tea or scoop'),
  rewardItems: [t('বাবল টি', 'Bubble tea'), t('স্কুপ আইসক্রিম', 'Ice cream scoop'), t('মিল্কশেক', 'Milkshake')],
  total: 10, collected: 7,
  color: '#E6012C', fg: '#FFFFFF', dark: true, stampBg: '#FFFFFF', stampFg: '#E6012C', dash: 'rgba(255,255,255,0.65)', deco1: 'rgba(254,173,40,0.95)', deco2: 'rgba(255,255,255,0.55)',
};

export type Branch = {
  id: string;
  name: Text;
  address: Text;
  /** Approximate coordinates, only used to sort outlets by distance. Replace with exact values. */
  lat: number;
  lng: number;
  staff: number;
  customers: number;
  main: boolean;
  chip: string;
};

/** AiCha Dhanmondi, the only outlet: House 38/1, Road 2, opposite Shimanto Square, Dhaka 1205 (takeaway, phone +880 1410-948249).
 *  Coordinates are approximate and only used for distance; the opening hours (12 PM to 12 AM) are set when the seed creates the row. */
export const branches: Branch[] = [
  { id: 'dhanmondi', name: t('আইচা ধানমন্ডি', 'AiCha Dhanmondi'), address: t('বাড়ি ৩৮/১, রোড ২, শিমান্ত স্কয়ারের বিপরীতে, ধানমন্ডি, ঢাকা ১২০৫', 'House 38/1, Road 2, opposite Shimanto Square, Dhanmondi, Dhaka 1205'), lat: 23.7392, lng: 90.3731, staff: 3, customers: 8, main: true, chip: '#E6012C' },
];

export type ActivityType = 'stamp' | 'reward' | 'join';
export type HistoryItem = { group: Text; type: ActivityType; detail: Text; time: Text; count?: number };

export type CustomerStatus = 'active' | 'ready' | 'inactive';
export type Customer = { id: string; initial: Text; name: Text; phone: string; stamps: number; visits: number; last: Text; status: CustomerStatus; avatar: string };

export type VoucherStatus = 'ready' | 'used' | 'expired';
export type Voucher = {
  id: string;
  /** Shown as text and encoded in the voucher QR. */
  code: string;
  title: Text;
  source: Text;
  earned: Text;
  expires: Text;
  daysLeft: number;
  status: VoucherStatus;
  usedOn?: Text;
  /** Items the customer picks from at the counter. */
  choices?: Text[];
  /** The ids of those items, in the same order: this is what is sent to the server when the cashier picks one. */
  choiceIds?: string[];
};

export type OfferKind = 'double' | 'stamp' | 'voucher' | 'info' | 'birthday';
export type Offer = {
  id: string;
  kind: OfferKind;
  /** Big mark on the offer banner. */
  badge: Text;
  title: Text;
  body: Text;
  /** Days left, or null when the offer has no end date. */
  endsInDays: number | null;
  /** 'stamp' offers: stamps added when claimed. */
  bonusStamps?: number;
  /** 'voucher' offers: the voucher created when claimed. */
  reward?: Text;
  voucherDays?: number;
  /** 'birthday' offers: when it unlocks. */
  unlocksOn?: Text;
  terms: Text[];
  bg: string;
  fg: string;
};

export const offers: Offer[] = [
  {
    id: 'welcome-back', kind: 'stamp', badge: t('+১', '+1'), title: t('ফিরে আসার Stamp', 'Welcome-back stamp'),
    body: t('এই সপ্তাহে আসার জন্য ধন্যবাদ! ১টি বোনাস Stamp নিন।', 'Thanks for visiting this week! Claim a free bonus stamp.'), endsInDays: 3, bonusStamps: 1,
    terms: [t('প্রতি গ্রাহক একবারই নিতে পারবেন', 'One claim per customer'), t('Stamp সরাসরি আপনার কার্ডে যোগ হবে', 'The stamp is added straight to your card')],
    bg: '#E6012C', fg: '#FFFFFF',
  },
  {
    id: 'free-topping', kind: 'voucher', badge: t('ফ্রি', 'FREE'), title: t('ফ্রি টপিং', 'Free topping'),
    body: t('যেকোনো বাবল টি বা মিল্কশেকের সাথে একটি ফ্রি টপিং।', 'A free topping with any bubble tea or milkshake.'), endsInDays: 6, reward: t('ফ্রি টপিং', 'Free topping'), voucherDays: 7,
    terms: [t('নেওয়ার ৭ দিনের মধ্যে ব্যবহার করতে হবে', 'Use within 7 days of claiming'), t('প্রতি ভিজিটে ১টি', 'One per visit')],
    bg: '#171717', fg: '#FEAD28',
  },
  {
    id: 'double-friday', kind: 'double', badge: t('২×', '2×'), title: t('শুক্রবার ডাবল Stamp', 'Double stamp Friday'),
    body: t('শুক্রবার আইচা ধানমন্ডিতে প্রতিটি কেনাকাটায় ২টি করে Stamp পাবেন।', 'Get 2 stamps on every purchase this Friday at AiCha Dhanmondi.'), endsInDays: 5,
    terms: [t('প্রতি কেনাকাটায় সর্বোচ্চ ২টি Stamp', 'Up to 2 stamps per purchase'), t('অন্য অফারের সাথে মেশানো যাবে না', 'Cannot be combined with other offers')],
    bg: '#FEAD28', fg: '#171717',
  },
  {
    id: 'tea-scoop-combo', kind: 'info', badge: t('কম্বো', 'COMBO'), title: t('গরম চা + স্কুপ কম্বো', 'Hot tea + scoop combo'),
    body: t('এক কাপ গরম চা আর এক স্কুপ আইসক্রিম। কাউন্টারে এই অফারটি দেখান।', 'A hot cup of tea with a scoop of ice cream. Show this offer at the counter.'), endsInDays: 12,
    terms: [t('সীমিত সময়ের জন্য', 'Limited time only'), t('Stamp যথারীতি পাবেন', 'Stamps are earned as usual')],
    bg: '#C90025', fg: '#FFFFFF',
  },
  {
    id: 'birthday', kind: 'birthday', badge: t('জন্মদিন', 'BDAY'), title: t('জন্মদিনের উপহার', 'Birthday treat'),
    body: t('জন্মদিনের সপ্তাহে একটি ফ্রি স্কুপ আইসক্রিম।', 'A free ice cream scoop in your birthday week.'), endsInDays: null, unlocksOn: t('১২ মার্চ', '12 March'),
    terms: [t('জন্মদিনের সপ্তাহে ব্যবহার করতে হবে', 'Use it during your birthday week')],
    bg: '#FF8A9A', fg: '#171717',
  },
];

/** Offers a customer has to claim first. The rest apply automatically or are shown at the counter. */
export const isClaimable = (o: Offer) => o.kind === 'stamp' || o.kind === 'voucher';
