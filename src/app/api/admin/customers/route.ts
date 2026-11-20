import { db } from '@/server/db';
import { adminCustomerView, listCustomers } from '@/server/domain/admin-customers';
import { writeAudit } from '@/server/domain/audit';
import { registerCustomer } from '@/server/auth/customer';
import { staffContext } from '@/server/domain/audit';
import { created, staffRoute } from '@/server/http';
import { adminCustomersQuery, createCustomerRequest } from '@/lib/contracts/schemas';
import type { AdminCustomerListDto } from '@/lib/contracts/admin';

/** The customer list with groups, search, sort and pages (MG-04). */
export const GET = staffRoute({ permission: 'customers.list', query: adminCustomersQuery }, async ({ staff, query }): Promise<AdminCustomerListDto> =>
  listCustomers(db(), { query, role: staff.staff.role, now: new Date() }));

/**
 * Add a customer from management (MG-05), after the code sent to their phone was typed in (see ./code). They get the welcome stamp
 * like anyone else (BR-17) and are sent their loyalty ID and a one-time password.
 */
export const POST = staffRoute({ permission: 'customers.list', body: createCustomerRequest }, async ({ staff, body, requestId }) => {
  const now = new Date();
  const result = await registerCustomer({ ...body, joinedVia: 'MANAGEMENT', staffId: staff.staff.id, now });
  await writeAudit(db(), staffContext(staff, requestId), { action: 'customer.create', entityType: 'Customer', entityId: result.customer.id, at: now });
  return created(await adminCustomerView(db(), { customerId: result.customer.id, role: staff.staff.role, now }));
});
