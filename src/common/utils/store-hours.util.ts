/**
 * Utility functions for handling store opening hours
 */

/**
 * Validates and parses time input in various formats
 * 
 * @param timeText - Time input text (e.g., "9:00", "22:30", "09:00")
 * @returns object with parsed hours/minutes and validation result
 */
export function validateAndParseTime(timeText: string): { hours: number | null; minutes: number | null; isValid: boolean; error?: string } {
  if (!timeText || typeof timeText !== 'string') {
    return { hours: null, minutes: null, isValid: false, error: 'Time text is required' };
  }

  // More flexible regex that accepts various formats
  // Accepts: 9:00, 09:00, 22:30, 0:00, 23:59, etc.
  const timeMatch = timeText.trim().match(/^(\d{1,2}):(\d{1,2})$/);
  
  if (!timeMatch) {
    return { hours: null, minutes: null, isValid: false, error: 'Invalid time format. Use HH:MM or H:MM (e.g., 9:00, 22:30)' };
  }

  const hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);

  // Validate hours (0-23)
  if (hours < 0 || hours > 23) {
    return { hours: null, minutes: null, isValid: false, error: 'Hours must be between 0 and 23' };
  }

  // Validate minutes (0-59)
  if (minutes < 0 || minutes > 59) {
    return { hours: null, minutes: null, isValid: false, error: 'Minutes must be between 0 and 59' };
  }

  return { hours, minutes, isValid: true };
}

/**
 * Validates and parses time range input in format "HH:MM - HH:MM"
 * 
 * @param timeRangeText - Time range input text (e.g., "09:00 - 18:00", "22:00 - 06:00")
 * @returns object with parsed start/end times and validation result
 */
export function validateAndParseTimeRange(timeRangeText: string): { 
  startTime: { hours: number; minutes: number } | null; 
  endTime: { hours: number; minutes: number } | null; 
  isValid: boolean; 
  error?: string 
} {
  if (!timeRangeText || typeof timeRangeText !== 'string') {
    return { startTime: null, endTime: null, isValid: false, error: 'Time range text is required' };
  }

  // Regex for time range format: "HH:MM - HH:MM"
  const timeRangeMatch = timeRangeText.trim().match(/^(\d{1,2}):(\d{1,2})\s*-\s*(\d{1,2}):(\d{1,2})$/);
  
  if (!timeRangeMatch) {
    return { 
      startTime: null, 
      endTime: null, 
      isValid: false, 
      error: 'Invalid time range format. Use HH:MM - HH:MM (e.g., 09:00 - 18:00)' 
    };
  }

  const startHours = parseInt(timeRangeMatch[1], 10);
  const startMinutes = parseInt(timeRangeMatch[2], 10);
  const endHours = parseInt(timeRangeMatch[3], 10);
  const endMinutes = parseInt(timeRangeMatch[4], 10);

  // Validate hours (0-23)
  if (startHours < 0 || startHours > 23 || endHours < 0 || endHours > 23) {
    return { 
      startTime: null, 
      endTime: null, 
      isValid: false, 
      error: 'Hours must be between 0 and 23' 
    };
  }

  // Validate minutes (0-59)
  if (startMinutes < 0 || startMinutes > 59 || endMinutes < 0 || endMinutes > 59) {
    return { 
      startTime: null, 
      endTime: null, 
      isValid: false, 
      error: 'Minutes must be between 0 and 59' 
    };
  }

  return { 
    startTime: { hours: startHours, minutes: startMinutes },
    endTime: { hours: endHours, minutes: endMinutes },
    isValid: true 
  };
}

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
  
  // Get current time in Uzbekistan timezone (UTC+5)
  const uzbekistanTime = new Date(now.getTime() + (5 * 60 * 60 * 1000)); // UTC+5
  const currentTime = uzbekistanTime.getHours() * 60 + uzbekistanTime.getMinutes(); // Convert to minutes from midnight
  
  console.log(`=== STORE HOURS CHECK ===`);
  console.log(`UTC time: ${now.toISOString()}`);
  console.log(`Uzbekistan time: ${uzbekistanTime.toISOString()}`);
  console.log(`Store hours: ${opensAt} - ${closesAt} (${Math.floor(opensAt/60)}:${(opensAt%60).toString().padStart(2,'0')} - ${Math.floor(closesAt/60)}:${(closesAt%60).toString().padStart(2,'0')})`);
  console.log(`Current time in minutes: ${currentTime} (${uzbekistanTime.getHours()}:${uzbekistanTime.getMinutes().toString().padStart(2,'0')})`);
  
  // Handle stores that operate across midnight
  if (opensAt > closesAt) {
    // Store operates across midnight (e.g., 22:00 - 06:00)
    // Store is open if current time is after opening OR before closing
    const isOpen = currentTime >= opensAt || currentTime <= closesAt;
    console.log(`Cross-midnight store: isOpen=${isOpen} (current >= opensAt: ${currentTime >= opensAt}, current <= closesAt: ${currentTime <= closesAt})`);
    return isOpen;
  } else {
    // Store operates within the same day (e.g., 09:00 - 18:00)
    // Store is open if current time is between opening and closing
    const isOpen = currentTime >= opensAt && currentTime <= closesAt;
    console.log(`Same-day store: isOpen=${isOpen} (current >= opensAt: ${currentTime >= opensAt}, current <= closesAt: ${currentTime <= closesAt})`);
    return isOpen;
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
 * Formats a date in relative time format (today, tomorrow, yesterday, or specific date)
 * 
 * @param date - Date to format
 * @param language - Language for localization ('uz' or 'ru')
 * @returns formatted relative time string (e.g., "today at 18:00", "tomorrow at 09:30")
 */
export function formatRelativeTime(date: Date | string, language: 'uz' | 'ru' = 'uz'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  // Get today's date at midnight for comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Get the date part of the target date (without time)
  const targetDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  
  // Format time as HH:MM
  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  const timeString = `${hours}:${minutes}`;
  
  // Determine relative date
  let relativeDate: string;
  if (targetDate.getTime() === today.getTime()) {
    relativeDate = language === 'ru' ? 'сегодня' : 'bugun';
  } else if (targetDate.getTime() === tomorrow.getTime()) {
    relativeDate = language === 'ru' ? 'завтра' : 'ertaga';
  } else if (targetDate.getTime() === yesterday.getTime()) {
    relativeDate = language === 'ru' ? 'вчера' : 'kecha';
  } else {
    // For dates more than 1 day away, use the original format
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    relativeDate = language === 'ru' ? `${day}/${month}/${year}` : `${day}/${month}/${year}`;
  }
  
  // Format: "today at 18:00" or "bugun soat 18:00"
  if (language === 'ru') {
    if (targetDate.getTime() === today.getTime() || targetDate.getTime() === tomorrow.getTime() || targetDate.getTime() === yesterday.getTime()) {
      return `${relativeDate} в ${timeString}`;
    } else {
      return `${relativeDate} в ${timeString}`;
    }
  } else {
    if (targetDate.getTime() === today.getTime() || targetDate.getTime() === tomorrow.getTime() || targetDate.getTime() === yesterday.getTime()) {
      return `${relativeDate} soat ${timeString}`;
    } else {
      return `${relativeDate} soat ${timeString}`;
    }
  }
}

/**
 * Formats a date in DD/MM/YYYY HH:MM format (24-hour)
 * 
 * @param date - Date to format
 * @returns formatted date string (e.g., "25/12/2024 14:30")
 */
export function formatDateForDisplay(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Don't add timezone offset - the time is already stored correctly
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  
  console.log(`=== DATE FORMATTING ===`);
  console.log(`Original date: ${dateObj.toISOString()}`);
  console.log(`Formatted: ${day}/${month}/${year} ${hours}:${minutes}`);
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Cleans and validates price input, removing common formatting mistakes
 * 
 * @param priceText - Raw price input text
 * @returns object with cleaned price number and validation result
 */
export function cleanAndValidatePrice(priceText: string): { price: number | null; isValid: boolean; error?: string } {
  if (!priceText || typeof priceText !== 'string') {
    return { price: null, isValid: false, error: 'Price text is required' };
  }

  // Remove all spaces, commas, and other common separators
  let cleanedText = priceText.trim()
    .replace(/\s+/g, '') // Remove all spaces
    .replace(/,/g, '') // Remove commas
    .replace(/\./g, '') // Remove dots (treat as thousand separators)
    .replace(/[^\d]/g, ''); // Remove all non-digit characters

  if (!cleanedText) {
    return { price: null, isValid: false, error: 'No valid digits found' };
  }

  const price = parseInt(cleanedText, 10);
  
  if (isNaN(price) || price <= 0) {
    return { price: null, isValid: false, error: 'Price must be a positive number' };
  }

  if (price > 1000000000) { // 1 billion max
    return { price: null, isValid: false, error: 'Price is too high' };
  }

  return { price, isValid: true };
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