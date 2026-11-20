import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/cn';

/** AiCha horizontal logo (penguin, wordmark and tagline). The dark version has a white outline round the penguin so it stays visible on dark surfaces. */
export function BrandLogo({ href = '/', className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn('inline-flex shrink-0 items-center', className)} aria-label="AiCha loyality">
      <Image src="/brand/aicha-logo-light.png" alt="" width={1200} height={473} priority className="h-14 w-auto dark:hidden md:h-16" />
      <Image src="/brand/aicha-logo-dark.png" alt="" width={1220} height={493} priority className="hidden h-14 w-auto dark:block md:h-16" />
    </Link>
  );
}

/** Round badge (penguin on AiCha red), used as the app icon and for small marks. */
/** The penguin on its own, transparent background, for hero art and empty states. */
export function Mascot({ size = 160, className }: { size?: number; className?: string }) {
  return <Image src="/brand/aicha-mascot.png" alt="" aria-hidden="true" width={Math.round(size * 0.877)} height={size} className={className} />;
}

export function BrandIcon({ size = 40, className }: { size?: number; className?: string }) {
  return <Image src="/brand/aicha-icon.png" alt="AiCha loyality" width={size} height={size} className={className} />;
}
