export interface ChoiceCount {
  value: string;
  label: string;
  count: number;
}

export interface TextTopItem {
  value: string;
  count: number;
}

export interface WordCount {
  word: string;
  count: number;
}

export type QuestionAnalytics =
  | {
      id: string;
      type: 'SINGLE_CHOICE';
      label: string;
      total: number;
      counts: ChoiceCount[];
    }
  | {
      id: string;
      type: 'MULTIPLE_CHOICE';
      label: string;
      total: number;
      counts: ChoiceCount[];
    }
  | {
      id: string;
      type: 'SHORT_TEXT' | 'LONG_TEXT';
      label: string;
      total: number;
      top: TextTopItem[];
      unique: number;
      topWords?: WordCount[];
    };

export type SurveyAnalytics = QuestionAnalytics[];
