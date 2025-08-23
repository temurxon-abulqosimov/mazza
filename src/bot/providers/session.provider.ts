import { Injectable } from '@nestjs/common';
import { SessionData } from 'src/common/types/session.type';

@Injectable()
export class SessionProvider {
  private sessions = new Map<string, SessionData>();

  getSession(telegramId: string): SessionData {
    console.log('=== SESSION PROVIDER ===');
    console.log('Getting session for:', telegramId);
    console.log('Existing sessions:', Array.from(this.sessions.keys()));
    
    if (!this.sessions.has(telegramId)) {
      console.log('Creating new session for:', telegramId);
      this.sessions.set(telegramId, {
        language: 'uz',
      });
    } else {
      console.log('Using existing session for:', telegramId);
    }
    
    const session = this.sessions.get(telegramId)!;
    console.log('Returning session:', session);
    return session;
  }

  setSession(telegramId: string, session: SessionData): void {
    console.log('=== SETTING SESSION ===');
    console.log('Setting session for:', telegramId);
    console.log('Session data:', session);
    this.sessions.set(telegramId, session);
  }

  updateSession(telegramId: string, updates: Partial<SessionData>): void {
    console.log('=== UPDATING SESSION ===');
    console.log('Updating session for:', telegramId);
    console.log('Updates:', updates);
    const session = this.getSession(telegramId);
    this.sessions.set(telegramId, { ...session, ...updates });
    console.log('Updated session:', this.sessions.get(telegramId));
  }

  clearSession(telegramId: string): void {
    this.sessions.delete(telegramId);
  }
} 