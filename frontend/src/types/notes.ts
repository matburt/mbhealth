export interface Note {
  id: number;
  health_data_id: number;
  user_id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface NoteCreate {
  health_data_id: number;
  content: string;
}

export interface NoteUpdate {
  content: string;
}

export interface NoteWithUser extends Note {
  user: {
    id: number;
    username: string;
    full_name?: string;
  };
} 