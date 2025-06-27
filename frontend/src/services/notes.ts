import api from './api';
import { Note, NoteCreate, NoteUpdate } from '../types/notes';

export const notesService = {
  async getNotes(healthDataId: number): Promise<Note[]> {
    const response = await api.get<Note[]>(`/notes/?health_data_id=${healthDataId}`);
    return response.data;
  },

  async createNote(note: NoteCreate): Promise<Note> {
    const response = await api.post<Note>('/notes/', note);
    return response.data;
  },

  async updateNote(id: number, note: NoteUpdate): Promise<Note> {
    const response = await api.put<Note>(`/notes/${id}`, note);
    return response.data;
  },

  async deleteNote(id: number): Promise<void> {
    await api.delete(`/notes/${id}`);
  }
}; 