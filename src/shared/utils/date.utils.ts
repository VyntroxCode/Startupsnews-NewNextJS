/**
 * Format date to "time ago" format (e.g., "2 hours ago", "1 day ago")
 */
export function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  let then: Date;
  
  if (typeof date === 'string') {
    then = new Date(date);
    // Check if date is valid
    if (isNaN(then.getTime())) {
      return 'Recently';
    }
  } else if (date instanceof Date) {
    then = date;
    // Check if date is valid
    if (isNaN(then.getTime())) {
      return 'Recently';
    }
  } else {
    return 'Recently';
  }
  
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
  if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) {
    // Return current date if no date provided
    return new Date().toISOString().split('T')[0];
  }
  
  let d: Date;
  if (typeof date === 'string') {
    d = new Date(date);
  } else if (date instanceof Date) {
    d = date;
  } else {
    // Fallback to current date
    return new Date().toISOString().split('T')[0];
  }
  
  // Check if date is valid
  if (isNaN(d.getTime())) {
    // Return current date if invalid
    return new Date().toISOString().split('T')[0];
  }
  
  return d.toISOString().split('T')[0];
}

