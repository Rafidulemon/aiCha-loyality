import { db } from '@/server/db';
import { registerCustomer } from '@/server/auth/customer';
import { searchCustomers, todaysCustomers } from '@/server/domain/customers';
import { cashierCustomerView } from '@/server/domain/views';
import { created, staffRoute } from '@/server/http';
import { cashierCustomersQuery, createCustomerRequest } from '@/lib/contracts/schemas';
import type { CustomerRowDto } from '@/lib/contracts/dto';

/**
 * Find a customer at the counter (CA-02). With `q` it searches by the last digits of a number, a full number or a name;
 * without it it lists the customers who were served at this outlet today (CA-14). A cashier cannot browse the whole customer list.
 */
export const GET = staffRoute({ permission: 'customers.search', query: cashierCustomersQuery }, async ({ staff, query }): Promise<{ mode: 'search' | 'today'; items: CustomerRowDto[] }> => {
  const now = new Date();
  if (query.q) return { mode: 'search', items: await searchCustomers(db(), { q: query.q, limit: query.limit, role: staff.staff.role, now }) };
  const items = staff.branchId ? await todaysCustomers(db(), { branchId: staff.branchId, role: staff.staff.role, now, limit: query.limit }) : [];
  return { mode: 'today', items };
});

/**
 * Add a new customer at the counter (CA-03), after the code sent to their phone was typed in (see ./code). They start with the welcome
 * stamp when the program gives one (BR-17) and are sent their loyalty ID and a one-time password.
 */
export const POST = staffRoute({ permission: 'counter.work', body: createCustomerRequest }, async ({ staff, body }) => {
  const now = new Date();
  const result = await registerCustomer({ ...body, joinedVia: 'COUNTER', staffId: staff.staff.id, branchId: staff.branchId, now });
  return created(await cashierCustomerView(db(), { customerId: result.customer.id, role: staff.staff.role, now }));
});
