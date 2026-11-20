import { redirect } from 'next/navigation';
import { readCustomerSession, readStaffSession } from '@/server/auth/session';

/**
 * There is no landing page: "/" sends each person to their own home. Signed-in staff go to the cashier app (/cashier) or the
 * management app (/admin) by role, a signed-in customer to their card, and everyone else to the customer sign-in (/auth/login).
 * Cashiers and management reach their own sign-in from /cashier and /admin.
 */
export const dynamic = 'force-dynamic';

export default async function Home() {
  const [staff, customer] = await Promise.all([readStaffSession(), readCustomerSession()]);
  if (staff) redirect(staff.staff.role === 'CASHIER' ? '/cashier' : '/admin');
  if (customer) redirect('/cards');
  redirect('/auth/login');
}
