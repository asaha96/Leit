import { SessionEntry, SessionStats } from '@/types/flashcard';

const SESSIONS_KEY = 'leat_sessions';
const STATS_KEY = 'leat_session_stats';

export function saveSessionEntries(entries: SessionEntry[]): void {
  try {
    const existingEntries = getSessionEntries();
    const allEntries = [...existingEntries, ...entries];
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(allEntries));
  } catch (error) {
    console.error('Failed to save session entries:', error);
  }
}

export function getSessionEntries(): SessionEntry[] {
  try {
    const stored = localStorage.getItem(SESSIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load session entries:', error);
    return [];
  }
}

export function saveSessionStats(stats: SessionStats): void {
  try {
    const existingStats = getSessionStats();
    const updatedStats = [...existingStats, { ...stats, timestamp: Date.now() }];
    localStorage.setItem(STATS_KEY, JSON.stringify(updatedStats));
  } catch (error) {
    console.error('Failed to save session stats:', error);
  }
}

export function getSessionStats(): (SessionStats & { timestamp: number })[] {
  try {
    const stored = localStorage.getItem(STATS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load session stats:', error);
    return [];
  }
}

export function exportSessionData(): void {
  try {
    const sessions = getSessionEntries();
    const stats = getSessionStats();
    
    const exportData = {
      sessions,
      stats,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `leat-session-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export session data:', error);
  }
}

export function clearAllData(): void {
  try {
    localStorage.removeItem(SESSIONS_KEY);
    localStorage.removeItem(STATS_KEY);
  } catch (error) {
    console.error('Failed to clear session data:', error);
  }
}

export function getDueCount(): number {
  try {
    const sessions = getSessionEntries();
    const now = new Date();
    
    // Get the latest session for each card
    const latestSessions = new Map<string, SessionEntry>();
    sessions.forEach(session => {
      const existing = latestSessions.get(session.cardId);
      if (!existing || session.timestamp > existing.timestamp) {
        latestSessions.set(session.cardId, session);
      }
    });
    
    // Count how many are due now
    let dueCount = 0;
    latestSessions.forEach(session => {
      const dueDate = new Date(session.nextDue);
      if (dueDate <= now) {
        dueCount++;
      }
    });
    
    return dueCount;
  } catch (error) {
    console.error('Failed to calculate due count:', error);
    return 0;
  }
}