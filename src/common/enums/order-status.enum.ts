export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  // kept for backward compatibility with existing data and clients
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}