import { SessionState } from "../conversation/stateMachine.js";

class InMemorySessionStore {
  private sessions = new Map<string, SessionState>();

  save(session: SessionState) {
    this.sessions.set(session.id, session);
  }

  get(id: string) {
    return this.sessions.get(id);
  }

  all() {
    return Array.from(this.sessions.values());
  }
}

export const sessionStore = new InMemorySessionStore();
