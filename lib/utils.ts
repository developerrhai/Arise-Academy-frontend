import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format time string to HH:MM format (24-hour, leading zero)
 * Accepts various formats and normalizes to HH:MM
 * @param timeStr - Time string to format (e.g., "8:30", "08:30 AM", "8:30am")
 * @returns Formatted time string in HH:MM format or empty string if invalid
 */
export function formatTime(timeStr: string): string {
  if (!timeStr) return '';

  // Remove whitespace and convert to uppercase for easier parsing
  const cleaned = timeStr.trim().replace(/\s+/g, '').toUpperCase();

  // Extract numbers using regex
  const match = cleaned.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '';

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  // Validate hours and minutes
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return '';
  }

  // Format with leading zeros
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
