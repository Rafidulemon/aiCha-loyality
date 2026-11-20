import { db } from '@/server/db';
import { customerRoute } from '@/server/http';
import type { NotificationDto, NotificationsDto } from '@/lib/contracts/dto';

/** The customer's notification list, newest first, with how many are unread. */
async function list(customerId: string): Promise<NotificationsDto> {
  const [rows, unread] = await Promise.all([
    db().notification.findMany({ where: { customerId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 40 }),
    db().notification.count({ where: { customerId, readAt: null } }),
  ]);
  const items: NotificationDto[] = rows.map((n) => ({
    id: n.id,
    kind: n.kind.toLowerCase().replace(/_/g, '-') as NotificationDto['kind'],
    params: (n.params ?? {}) as Record<string, unknown>,
    createdAt: n.createdAt.toISOString(),
    read: n.readAt !== null,
  }));
  return { items, unread };
}

export const GET = customerRoute({}, async ({ customer }): Promise<NotificationsDto> => list(customer.customerId));

/** Mark everything read, and answer with the fresh list so the screen does not need a second request. */
export const POST = customerRoute({}, async ({ customer }) => {
  await db().notification.updateMany({ where: { customerId: customer.customerId, readAt: null }, data: { readAt: new Date() } });
  return list(customer.customerId);
});
