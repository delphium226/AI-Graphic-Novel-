
export interface StoryPart {
  text: string;
  imageUrl: string | null;
}

export enum AppStatus {
  IDLE = 'IDLE',
  HINT_ENTRY = 'HINT_ENTRY',
  ANALYSING = 'ANALYSING',
  READY = 'READY',
  ERROR = 'ERROR',
  EXTENDING = 'EXTENDING'
}
