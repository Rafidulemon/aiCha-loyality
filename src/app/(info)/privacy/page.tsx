'use client';

import { ShieldCheck } from 'lucide-react';
import { LegalDocument } from '@/components/legal-page';
import { PRIVACY } from '@/lib/legal';

export default function PrivacyPage() {
  return (
    <LegalDocument
      icon={<ShieldCheck size={26} aria-hidden="true" />}
      title={{ bn: 'প্রাইভেসি পলিসি', en: 'Privacy policy' }}
      subtitle={{ bn: 'আপনার তথ্য আমরা কীভাবে নিই, ব্যবহার করি ও সুরক্ষিত রাখি।', en: 'How we collect, use and protect your information.' }}
      sections={PRIVACY}
    />
  );
}
