import type { SchoolSession, Teacher, Preferences } from './contracts';

export interface SessionSummary { id: string; title: string; mentorName: string; status: SchoolSession['status']; updatedAt: string }
export interface ProviderStatus { configured: boolean; provider: string; liveValidated: boolean; message: string }
export async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/school/${path}`, { credentials: 'same-origin', cache: 'no-store',
    ...(body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('The local School API is unavailable. Start this checkout with npm run dev or npm run preview.');
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || 'The request failed. Reopen the session to check its saved state.');
  return value;
}
export const schoolApi = {
  status: () => request<ProviderStatus>('status'),
  list: () => request<SessionSummary[]>('sessions'),
  open: (id: string) => request<SchoolSession>(`sessions/${id}`),
  teachers: () => request<Teacher[]>('teachers'),
  createTeacher: (name: string) => request<Teacher>('teachers', { name }),
  create: (goal: string, mentor: string, preferences?: Preferences) => request<SchoolSession>('sessions', { goal, mentor, ...(preferences ? { preferences } : {}) }),
  action: (session: SchoolSession, action: string, fields = {}) => request<SchoolSession>(`sessions/${session.id}/${action}`, { revision: session.revision, ...fields }),
};
