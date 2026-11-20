import type { Text } from './i18n';

const t = (bn: string, en: string): Text => ({ bn, en });

/** AiCha Dhanmondi's contact details, shown on the Help page. */
export const CONTACT = {
  phone: '+8801410948249',
  phoneShown: '+880 1410-948249',
  address: t('বাড়ি ৩৮/১, রোড ২, শিমান্ত স্কয়ারের বিপরীতে, ধানমন্ডি, ঢাকা ১২০৫', 'House 38/1, Road 2, opposite Shimanto Square, Dhanmondi, Dhaka 1205'),
  hours: t('প্রতিদিন দুপুর ১২টা – রাত ১২টা', 'Every day, 12 PM – 12 AM'),
  facebook: 'https://www.facebook.com/aichadhanmondi2/',
  map: 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent('AiCha Dhanmondi, House 38/1, Road 2, Dhanmondi, Dhaka 1205'),
};

export type Section = { id: string; title: Text; body?: Text[]; bullets?: Text[] };

/** Last change to the privacy policy and terms (shown on both pages). */
export const LEGAL_UPDATED = t('২০ নভেম্বর ২০২৬', '20 November 2026');

export const FAQ: { q: Text; a: Text }[] = [
  {
    q: t('কীভাবে Stamp পাব?', 'How do I earn a stamp?'),
    a: t('আইচা ধানমন্ডিতে কেনাকাটার সময় ক্যাশিয়ারকে আপনার কার্ডের QR কোড দেখান। তিনি স্ক্যান করলেই Stamp যোগ হয়ে যাবে। নির্দিষ্ট পরিমাণের বেশি কেনাকাটায় Stamp মেলে, আর একদিনে সর্বোচ্চ কত Stamp পাবেন তার সীমা আছে। দুটোই আপনার কার্ডের বিস্তারিত পাতায় দেখতে পাবেন।', 'Show the QR code on your card to the cashier when you buy something at AiCha Dhanmondi. Once they scan it, the stamp is added. Stamps are given for purchases above a minimum amount, and there is a limit on how many you can earn in a day. Both are shown on your card details page.'),
  },
  {
    q: t('কার্ড পূর্ণ হলে কী হবে?', 'What happens when my card is full?'),
    a: t('কার্ড পূর্ণ হলে আপনি একটি Reward ভাউচার পাবেন এবং নতুন কার্ড নিজে থেকেই শুরু হবে। Rewards ট্যাবে ভাউচারটি খুলে কাউন্টারে QR দেখান, তারপর পছন্দের আইটেমটি নিন।', 'When the card is full you get a reward voucher and a new card starts by itself. Open the voucher in the Rewards tab, show its QR at the counter and pick your item.'),
  },
  {
    q: t('ভাউচারের মেয়াদ কতদিন?', 'How long does a voucher last?'),
    a: t('প্রতিটি ভাউচারে মেয়াদ লেখা থাকে। মেয়াদ শেষ হলে ভাউচার আর ব্যবহার করা যায় না, তাই সময়মতো ব্যবহার করুন।', 'Every voucher shows its expiry date. An expired voucher cannot be used, so redeem it in time.'),
  },
  {
    q: t('আমি কি নম্বর বদলাতে পারব?', 'Can I change my phone number?'),
    a: t('আপনার কার্ড মোবাইল নম্বরের সাথে যুক্ত, তাই অ্যাপ থেকে নম্বর বদলানো যায় না। নতুন নম্বর নিতে চাইলে আউটলেটে এসে আমাদের জানান।', 'Your card is tied to your mobile number, so it cannot be changed in the app. If you want to move to a new number, tell us at the outlet.'),
  },
  {
    q: t('জন্মদিন ভুল দিয়েছি, কী করব?', 'I entered the wrong birthday. What now?'),
    a: t('নিরাপত্তার জন্য জন্মদিন একবার সেট করলে অ্যাপে আর বদলানো যায় না। ভুল হলে আউটলেটে আমাদের জানান, আমরা দেখব।', 'For fairness a birthday cannot be changed in the app once it is saved. If it is wrong, tell us at the outlet and we will look into it.'),
  },
  {
    q: t('কোড বা OTP আসছে না', 'My code never arrives'),
    a: t('নম্বরটি ঠিক আছে কিনা দেখুন এবং এক মিনিট অপেক্ষা করে আবার চেষ্টা করুন। অল্প সময়ে অনেকবার চেষ্টা করলে কিছুক্ষণের জন্য বন্ধ হয়ে যেতে পারে। তাতেও না হলে আমাদের ফোন করুন।', 'Check the number is right, wait a minute and try again. Asking for too many codes in a short time pauses new requests for a while. If it still does not arrive, call us.'),
  },
  {
    q: t('নোটিফিকেশন কীভাবে বন্ধ করব?', 'How do I turn notifications off?'),
    a: t('প্রোফাইল > নোটিফিকেশন-এ গিয়ে SMS, পুশ ও ইমেইলের সুইচ আলাদাভাবে বন্ধ করতে পারেন।', 'Go to Profile > Notifications and switch SMS, push and email off separately.'),
  },
  {
    q: t('আমার তথ্য মুছে ফেলতে চাই', 'I want my data deleted'),
    a: t('প্রোফাইল পাতার নিচে “অ্যাকাউন্ট মুছুন” চাপুন। আপনার নাম, নম্বর, ইমেইল ও জন্মদিন মুছে যাবে এবং জমানো Stamp ও Reward আর ব্যবহার করা যাবে না।', 'Press “Delete account” at the bottom of the Profile page. Your name, number, email and birthday are erased, and your stamps and rewards can no longer be used.'),
  },
];

export const PRIVACY: Section[] = [
  {
    id: 'collect',
    title: t('আমরা কী তথ্য নিই', 'What we collect'),
    body: [t('আইচা ধানমন্ডি আপনার লয়্যালটি কার্ড চালাতে যতটুকু দরকার ততটুকুই তথ্য নেয়:', 'AiCha Dhanmondi only collects what it needs to run your loyalty card:')],
    bullets: [
      t('মোবাইল নম্বর, যা দিয়ে আপনি সাইন ইন করেন', 'Your mobile number, which you use to sign in'),
      t('আপনার নাম', 'Your name'),
      t('ইমেইল ঠিকানা ও জন্মদিন, যদি আপনি দেন (দুটোই ঐচ্ছিক)', 'Your email address and birthday, if you give them (both optional)'),
      t('Stamp, Reward ও অফার ব্যবহারের ইতিহাস এবং কোন তারিখে কোথায় তা হয়েছে', 'Your stamp, reward and offer history, with the date and the outlet'),
      t('আপনি চালু করলে পুশ নোটিফিকেশনের জন্য ডিভাইসের ঠিকানা', 'If you turn on push notifications, an address for your device'),
    ],
  },
  {
    id: 'use',
    title: t('কীভাবে ব্যবহার করি', 'How we use it'),
    bullets: [
      t('আপনার Stamp গোনা এবং Reward দেওয়া', 'To count your stamps and give your rewards'),
      t('জন্মদিনের অফারের মতো আপনার জন্য অফার দেওয়া', 'To offer things like the birthday treat'),
      t('আপনার পছন্দ অনুযায়ী SMS, পুশ বা ইমেইলে খবর পাঠানো', 'To send news by SMS, push or email, as you chose'),
      t('ভুল বা অপব্যবহার ঠেকানো এবং হিসাব ঠিক রাখা', 'To prevent mistakes and misuse, and keep the numbers right'),
    ],
    body: [t('আমরা আপনার তথ্য বিক্রি করি না এবং বিজ্ঞাপনের জন্য অন্য কাউকে দিই না।', 'We do not sell your information and do not give it to anyone for advertising.')],
  },
  {
    id: 'choices',
    title: t('আপনার পছন্দ', 'Your choices'),
    bullets: [
      t('অফারের SMS, পুশ ও ইমেইল নোটিফিকেশন প্রোফাইল থেকে যেকোনো সময় আলাদাভাবে বন্ধ করা যায়।', 'You can switch offer SMS, push and email notifications off at any time in your Profile.'),
      t('নাম ও ইমেইল যেকোনো সময় বদলানো যায়।', 'You can change your name and email whenever you like.'),
      t('জন্মদিন একবার সেট করলে বদলানো যায় না, যাতে জন্মদিনের অফার বারবার নেওয়া না যায়।', 'A birthday cannot be changed once it is set, so the birthday treat cannot be claimed twice.'),
    ],
  },
  {
    id: 'sharing',
    title: t('কার সাথে ভাগ করি', 'Who we share it with'),
    body: [t('SMS পাঠানো ও অ্যাপ চালানোর জন্য আমাদের সেবাদাতারা (যেমন SMS ও ডেটাবেস সেবা) আপনার তথ্য ব্যবহার করে, কিন্তু শুধু আমাদের হয়ে কাজ করার জন্য। আইন যেটা বাধ্যতামূলক করে তার বাইরে আর কারও সাথে তথ্য ভাগ করা হয় না।', 'The services that send our SMS and host the app (such as the SMS and database providers) handle your information, but only to work for us. Beyond what the law requires, it is not shared with anyone else.')],
  },
  {
    id: 'keep',
    title: t('কতদিন রাখি ও নিরাপত্তা', 'How long we keep it and how we protect it'),
    body: [
      t('আপনার অ্যাকাউন্ট থাকা পর্যন্ত তথ্য রাখা হয়। সাইন-ইন সেশন সুরক্ষিত কুকিতে থাকে এবং কোড বা পিন কখনো লগে রাখা হয় না।', 'We keep your information while your account exists. Sign-in sessions live in protected cookies, and codes and PINs are never written to logs.'),
      t('অ্যাকাউন্ট মুছলে নাম, নম্বর, ইমেইল ও জন্মদিন মুছে যায়। নামহীন Stamp ও Reward-এর সংখ্যা হিসাবের জন্য থাকে।', 'When you delete your account your name, number, email and birthday are erased. Anonymous stamp and reward counts stay so our records add up.'),
    ],
  },
  {
    id: 'contact',
    title: t('যোগাযোগ', 'Contact us'),
    body: [t('গোপনীয়তা নিয়ে প্রশ্ন থাকলে আউটলেটে বা ফোনে (+৮৮০ ১৪১০-৯৪৮২৪৯) জানান। আমরা এই নীতি বদলালে এখানে তারিখসহ জানিয়ে দেব।', 'For any privacy question, tell us at the outlet or call +880 1410-948249. If we change this policy we will update it here with the date.')],
  },
];

export const TERMS: Section[] = [
  {
    id: 'about',
    title: t('এই লয়্যালটি কার্ড', 'About this loyalty card'),
    body: [t('এই অ্যাপ আইচা আইসক্রিম অ্যান্ড টি-এর ধানমন্ডি আউটলেটের ডিজিটাল Stamp কার্ড। অ্যাপ ব্যবহার করলে আপনি এই শর্তগুলো মেনে নিচ্ছেন।', 'This app is the digital stamp card for the Ai-CHA Ice Cream & Tea Dhanmondi outlet. By using it you accept these terms.')],
  },
  {
    id: 'account',
    title: t('আপনার অ্যাকাউন্ট', 'Your account'),
    bullets: [
      t('একটি মোবাইল নম্বরে একটি অ্যাকাউন্ট ও একটি কার্ড।', 'One mobile number has one account and one card.'),
      t('আপনার কোড অন্য কারও সাথে ভাগ করবেন না। আপনার অ্যাকাউন্টে যা হয় তার দায়িত্ব আপনার।', 'Do not share your sign-in code. You are responsible for what happens on your account.'),
      t('দেওয়া তথ্য সত্য ও সঠিক হতে হবে।', 'The details you give must be true and correct.'),
    ],
  },
  {
    id: 'stamps',
    title: t('Stamp ও Reward', 'Stamps and rewards'),
    bullets: [
      t('আউটলেটে যোগ্য কেনাকাটা করলে এবং কার্ডের QR স্ক্যান করালে Stamp যোগ হয়। ন্যূনতম কেনাকাটা, একদিনের সীমা ও কার্ডে কয়টি Stamp লাগে তা কার্ডের পাতায় লেখা থাকে এবং বদলাতে পারে।', 'Stamps are added when you make a qualifying purchase and have your card QR scanned. The minimum purchase, the daily limit and how many stamps fill a card are shown on the card page and can change.'),
      t('কার্ড পূর্ণ হলে একটি Reward ভাউচার তৈরি হয়। ভাউচারে মেয়াদ ও কোন আইটেম নেওয়া যাবে তা লেখা থাকে।', 'A full card creates a reward voucher. The voucher shows its expiry and the items you can choose from.'),
      t('প্রতিটি ভাউচার একবারই ব্যবহার করা যায়। ব্যবহার বা মেয়াদ শেষ হলে তা ফেরত বা নগদে বদল হয় না।', 'A voucher can be used once. A used or expired voucher cannot be refunded or exchanged for cash.'),
      t('Stamp ও Reward কারও কাছে বিক্রি বা হস্তান্তর করা যায় না।', 'Stamps and rewards cannot be sold or transferred.'),
    ],
  },
  {
    id: 'offers',
    title: t('অফার', 'Offers'),
    body: [t('প্রতিটি অফারের নিজস্ব শর্ত ও মেয়াদ থাকে এবং তা অফারের পাতায় দেখা যায়। অফার একসাথে মেশানো যায় কিনা সেটাও সেখানে লেখা থাকে। জন্মদিনের অফার বছরে একবার, জন্মদিনের সপ্তাহে।', 'Each offer has its own terms and end date, shown on the Offers page, including whether it can be combined with others. The birthday treat is once a year, in your birthday week.')],
  },
  {
    id: 'fair',
    title: t('ন্যায্য ব্যবহার', 'Fair use'),
    body: [t('ভুয়া কেনাকাটা, একাধিক অ্যাকাউন্ট বা অন্য কোনোভাবে Stamp বা Reward হাতানোর চেষ্টা করলে আমরা Stamp বাতিল, ভাউচার বন্ধ বা অ্যাকাউন্ট স্থগিত করতে পারি। ভুল ধরা পড়লে আমরা কার্ড ঠিক করে দিতে পারি।', 'If someone tries to get stamps or rewards through fake purchases, several accounts or any other misuse, we may cancel stamps, void vouchers or suspend the account. If a mistake is found we may correct your card.')],
  },
  {
    id: 'changes',
    title: t('পরিবর্তন ও সমাপ্তি', 'Changes and ending'),
    body: [
      t('আমরা কার্ডের নিয়ম, অফার বা এই শর্ত বদলাতে পারি। বদলালে এখানে নতুন তারিখ দেখানো হবে। আগে অর্জিত Stamp ও Reward-এর মেয়াদ আমরা ন্যায্যভাবে সম্মান করব।', 'We may change the card rules, the offers or these terms. A change shows a new date here. We will treat stamps and rewards you already earned fairly.'),
      t('আপনি যেকোনো সময় প্রোফাইল থেকে অ্যাকাউন্ট মুছতে পারেন।', 'You can delete your account at any time from your Profile.'),
    ],
  },
  {
    id: 'contact',
    title: t('যোগাযোগ', 'Contact'),
    body: [t('শর্ত নিয়ে প্রশ্ন থাকলে আউটলেটে বা +৮৮০ ১৪১০-৯৪৮২৪৯ নম্বরে জানান।', 'Questions about these terms: tell us at the outlet or call +880 1410-948249.')],
  },
];
