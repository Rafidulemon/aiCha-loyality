'use client';

import { ScrollText } from 'lucide-react';
import { LegalDocument } from '@/components/legal-page';
import { TERMS } from '@/lib/legal';

export default function TermsPage() {
  return (
    <LegalDocument
      icon={<ScrollText size={26} aria-hidden="true" />}
      title={{ bn: 'শর্তাবলী', en: 'Terms of service' }}
      subtitle={{ bn: 'আইচা লয়্যালটি কার্ড ব্যবহারের সহজ নিয়মগুলো।', en: 'The simple rules for using the AiCha loyalty card.' }}
      sections={TERMS}
    />
  );
}
