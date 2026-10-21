export interface Mentor {
  name: string;
  era: string;
  expertise: string;
  rationale: string;
  id?: string;
  title?: string;
  bio?: string;
  passion?: string;
  greeting?: string;
  systemInstruction?: string;
  suggestedPrompts?: string[];
  source?: string;
  identity?: { status: string; reason: string; caveats: string[] };
}
export type Teacher = Omit<Mentor, 'rationale'>;
export interface Preferences { difficulty: 'beginner' | 'intermediate' | 'advanced'; style: 'balanced' | 'explanation' | 'dialogue'; timeBudget: string }
export interface ConversationAssessment {
  id: string; createdAt: string; throughMessageIndex: number; summary: string; overall: string; limitations: string[];
  objectives: { objectiveId: string; status: string; evidence: { messageIndex: number; quote: string; explanation: string }[]; gaps: string[]; nextSteps: string[] }[];
}

export interface Objective { id: string; label: string }
export interface Message { role: 'user' | 'assistant'; text: string }
export interface Question { id: string; objectiveId: string; prompt: string; options: string[] }
export interface Attempt {
  id: string;
  correct: number;
  total: number;
  passed: boolean;
  missedObjectiveIds: string[];
  feedback: { objectiveId: string; prompt: string; correct: boolean; explanation: string }[];
}
export interface SchoolSession {
  id: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  goal: string;
  title: string;
  mentor: Mentor;
  objectives: Objective[];
  messages: Message[];
  suggestions: string[];
  status: 'learning' | 'quiz' | 'needs_review' | 'complete';
  reviewCompleted: boolean;
  quiz: { id: string; questions: Question[] } | null;
  attempts: Attempt[];
  description?: string;
  durationEstimate?: string;
  preferences?: Preferences;
  mentorReview?: { reason: string; caveats: string[]; alternatives: { mentorId: string; name: string; reason: string }[] };
  assessments?: ConversationAssessment[];
  presentations?: PresentationRequest[];
}

// Future presentation adapters consume inert requests. Teaching has no authoring tools.
// No adapter, scene generation, or execution is enabled in phase one.
export interface PresentationRequest {
  id: string;
  kind: 'location' | 'lab' | 'artifact';
  description: string;
  objectiveId: string;
  title: string;
  prompt: string;
  status: 'pending' | 'unavailable';
  reason: string;
  createdAt: string;
}
export type PresentationOutcome =
  | { requestId: string; status: 'pending' }
  | { requestId: string; status: 'failed'; reason: string }
  | { requestId: string; status: 'unavailable'; reason: string }
  | { requestId: string; status: 'confirmed'; runtimeId: string; objectId: string };
