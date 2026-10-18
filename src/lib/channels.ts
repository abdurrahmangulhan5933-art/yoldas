export const CHANNEL_IDS = ['e5', 'kapikule', 'avrupa', 'gece', 'anadolu', 'mola'] as const;
export type ChannelId = (typeof CHANNEL_IDS)[number];
