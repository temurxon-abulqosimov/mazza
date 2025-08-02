import { randomBytes } from 'crypto';

export function generateBookingCode(): string {
  return randomBytes(3).toString('hex').toUpperCase(); // e.g. A1B2C3
}
