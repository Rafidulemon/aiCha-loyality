import { sendTest, type PushResult } from '@/server/domain/push';
import { customerRoute } from '@/server/http';

/** "Send me a test": a notification to every device this customer turned them on for. */
export const POST = customerRoute({}, async ({ customer }): Promise<PushResult> => sendTest(customer.customerId));
