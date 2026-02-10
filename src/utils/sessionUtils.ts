import { User } from '../types/auth';

const SESSION_KEY = 'hrms_session';
const TOKEN_KEY = 'hrms_token';

/**
 * Generate a random session token
 */
export function generateSessionToken(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Save user session to localStorage
 */
export function saveSession(user: User): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_KEY, generateSessionToken());
  } catch (error) {
    console.error('Failed to save session:', error);
  }
}

/**
 * Get current session from localStorage
 */
export function getSession(): User | null {
  try {
    const sessionData = localStorage.getItem(SESSION_KEY);
    if (!sessionData) return null;
    return JSON.parse(sessionData);
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
}

/**
 * Clear session from localStorage
 */
export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to clear session:', error);
  }
}

/**
 * Check if a valid session exists
 */
export function hasSession(): boolean {
  return !!localStorage.getItem(SESSION_KEY) && !!localStorage.getItem(TOKEN_KEY);
}
