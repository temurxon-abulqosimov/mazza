/**
 * Utility functions for handling store opening hours
 */

/**
 * Determines if a store is currently open based on its opening and closing hours
 * Handles cases where stores operate across midnight (e.g., 22:00 - 06:00)
 * 
 * @param opensAt - Opening time in minutes from midnight (0-1439)
 * @param closesAt - Closing time in minutes from midnight (0-1439)
 * @returns boolean indicating if the store is currently open
 */
export function isStoreOpen(opensAt: number, closesAt: number): boolean {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes(); // Convert to minutes from midnight
  
  // Handle stores that operate across midnight
  if (opensAt > closesAt) {
    // Store operates across midnight (e.g., 22:00 - 06:00)
    // Store is open if current time is after opening OR before closing
    return currentTime >= opensAt || currentTime <= closesAt;
  } else {
    // Store operates within the same day (e.g., 09:00 - 18:00)
    // Store is open if current time is between opening and closing
    return currentTime >= opensAt && currentTime <= closesAt;
  }
}

/**
 * Formats opening hours for display
 * 
 * @param opensAt - Opening time in minutes from midnight
 * @param closesAt - Closing time in minutes from midnight
 * @returns formatted time string (e.g., "09:00 - 18:00" or "22:00 - 06:00")
 */
export function formatStoreHours(opensAt: number, closesAt: number): string {
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };
  
  return `${formatTime(opensAt)} - ${formatTime(closesAt)}`;
}

/**
 * Validates store opening hours
 * 
 * @param opensAt - Opening time in minutes from midnight
 * @param closesAt - Closing time in minutes from midnight
 * @returns boolean indicating if the hours are valid
 */
export function validateStoreHours(opensAt: number, closesAt: number): boolean {
  return opensAt >= 0 && opensAt <= 1439 && closesAt >= 0 && closesAt <= 1439;
} 