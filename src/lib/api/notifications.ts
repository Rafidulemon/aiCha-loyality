'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import type { NotificationDto, NotificationsDto } from '@/lib/contracts/dto';
import type { Text } from '@/lib/i18n';
import { clock, day, groupLabel } from '@/lib/format';
import { api } from './client';

const t = (bn: string, en: string): Text => ({ bn, en });
type Pair = { bn?: string; en?: string } | null | undefined;
const pair = (v: unknown): Pair => (v && typeof v === 'object' ? (v as Pair) : null);

/** A notification as the screen draws it. The text is built here from the kind and details, so it follows the language setting. */
export type NotificationView = { id: string; color: string; mark: string; title: Text; body: Text; time: Text; unread: boolean };

export function toNotification(n: NotificationDto, now = Date.now()): NotificationView {
  const at = Date.parse(n.createdAt);
  const time = groupLabel(at, now).en === 'Today' ? clock(at) : day(at);
  const title = pair(n.params.title);
  const item = pair(n.params.item);
  const base = { id: n.id, time, unread: !n.read };
  switch (n.kind) {
    case 'welcome':
      return { ...base, color: '#7FD8CE', mark: '↻', title: t('AiCha loyality-তে স্বাগতম', 'Welcome to AiCha loyality'), body: t('যেকোনো আউটলেটে QR দেখিয়ে Stamp জমানো শুরু করুন।', 'Show your QR at any AiCha branch to start collecting stamps.') };
    case 'reward-unlocked':
      return {
        ...base,
        color: '#FEAD28',
        mark: '★',
        title: t(`Reward আনলক: ${title?.bn ?? ''}`, `Reward unlocked: ${title?.en ?? ''}`),
        body: t('যেকোনো আউটলেটে ভাউচার দেখিয়ে নিন।', 'Show the voucher at any AiCha outlet to get it.'),
      };
    case 'reward-redeemed':
      return {
        ...base,
        color: '#8FE3D8',
        mark: '✓',
        title: t('Reward নেওয়া হয়েছে', 'Reward redeemed'),
        body: t(`${item?.bn ?? title?.bn ?? 'Reward'} নিয়েছেন। মজা করে খান!`, `You got ${item?.en ?? title?.en ?? 'your reward'}. Enjoy!`),
      };
    case 'offer-claimed':
      return { ...base, color: '#FF8A9A', mark: '2×', title: t('অফার নেওয়া হয়েছে', 'Offer claimed'), body: t('আপনার কার্ড আপডেট হয়েছে।', 'Your card was updated.') };
  }
}

/** The customer's notifications, newest first, with a way to mark them all read. */
export function useNotifications() {
  const { data, isLoading, mutate } = useSWR<NotificationsDto>('/api/me/notifications', { refreshInterval: 30_000 });
  const items = useMemo(() => (data?.items ?? []).map((n) => toNotification(n)), [data]);
  return {
    items,
    unread: data?.unread ?? 0,
    loading: isLoading,
    markAllRead: async () => {
      // Show them read at once; the server's answer (the fresh list) replaces the guess, or the old list comes back on failure.
      const next = await mutate(
        async () => api.post<NotificationsDto>('/api/me/notifications'),
        { optimisticData: (cur) => (cur ? { items: cur.items.map((i) => ({ ...i, read: true })), unread: 0 } : cur!), rollbackOnError: true, revalidate: false, populateCache: true },
      );
      return next;
    },
  };
}
