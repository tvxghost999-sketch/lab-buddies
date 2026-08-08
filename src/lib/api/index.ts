// Future backend integration API client placeholder
// This file can be swapped with Axios or Fetch implementations once the backend is ready.

import { Room, Member, FeedItem, Note } from '../types';

export const apiClient = {
  getRoom: async (pin: string): Promise<Room | null> => {
    console.log('API Call: getRoom', pin);
    return null;
  },
  createRoom: async (roomData: Partial<Room>): Promise<Room> => {
    console.log('API Call: createRoom', roomData);
    throw new Error('Not implemented');
  },
  joinRoom: async (pin: string, name: string): Promise<{ room: Room; member: Member }> => {
    console.log('API Call: joinRoom', pin, name);
    throw new Error('Not implemented');
  },
  getFeed: async (pin: string): Promise<FeedItem[]> => {
    console.log('API Call: getFeed', pin);
    return [];
  },
  getNotes: async (pin: string): Promise<Note[]> => {
    console.log('API Call: getNotes', pin);
    return [];
  }
};
