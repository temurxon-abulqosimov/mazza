import { Injectable } from '@nestjs/common';
import { SessionData } from 'src/common/types/session.type';

@Injectable()
export class SessionProvider {
  private sessions = new Map<string, SessionData>();

  getSession(telegramId: string): SessionData {
    if (!this.sessions.has(telegramId)) {
      const newSession: SessionData = {
        language: 'uz',
      };
      this.sessions.set(telegramId, newSession);
      return newSession;
    } else {
      const existingSession = this.sessions.get(telegramId)!;
      return existingSession;
    }
  }

  setSession(telegramId: string, session: SessionData): void {
    this.sessions.set(telegramId, session);
  }

  updateSession(telegramId: string, updates: Partial<SessionData>): void {
    const session = this.getSession(telegramId);
    this.sessions.set(telegramId, { ...session, ...updates });
  }

  clearSession(telegramId: string): void {
    this.sessions.delete(telegramId);
  }
} 