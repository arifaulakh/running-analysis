export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export interface DeliveryAdapter {
  send(payload: PushPayload): Promise<{ sent: number; failed: number }>;
}
