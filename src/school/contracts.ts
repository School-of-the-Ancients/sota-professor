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
  learningIntent?: string;
  interaction?: InteractionRequirement;
  receipt?: PresentationReceipt;
}
export type InteractionCapability = 'move' | 'rotate' | 'select' | 'measure' | 'simulate';
export interface InteractionRequirement {
  requirement: 'none' | 'required' | 'unspecified';
  description: string;
  capabilities: InteractionCapability[];
}
export interface PresentationHandoff {
  version: 1; requestId: string; sessionId: string; kind: PresentationRequest['kind']; title: string;
  learningIntent: string; learningObjective: Objective; requestedInteraction: InteractionRequirement; visualPrompt: string;
}
export interface SelectedConcept { id: string; version: number }
export interface AssetReceipt { id: string; format: 'image' | 'glb'; validation: 'generated' | 'validated_glb' }
export interface LoadedObjectReceipt { runtimeId: string; objectId: string }
export type PresentationReceipt = { requestId: string; adapterId: string } & (
  | { status: 'pending' | 'failed' | 'unavailable'; reason: string }
  | { status: 'mockup_generated' | 'asset_generated'; concept: SelectedConcept; asset: AssetReceipt }
  | { status: 'object_loaded'; concept: SelectedConcept; asset: AssetReceipt; object: LoadedObjectReceipt }
  | { status: 'interaction_verified'; concept: SelectedConcept; asset: AssetReceipt; object: LoadedObjectReceipt;
      interaction: { capabilities: InteractionCapability[]; evidence: { kind: 'automated' | 'desktop' | 'headset_wearer'; reference: string } } }
);
export type PresentationOutcome = PresentationReceipt;
// Future trusted server adapter only. No implementation is configured and none
// of these operations is exposed as a teacher tool or browser authoring endpoint.
export interface PresentationAdapter {
  readonly id: string;
  availability(): Promise<{ available: boolean; reason: string }>;
  requestMockup(request: PresentationHandoff): Promise<PresentationReceipt>;
  createFromSelectedConcept(request: PresentationHandoff, selected: SelectedConcept): Promise<PresentationReceipt>;
  getReceipt(requestId: string): Promise<PresentationReceipt>;
}
