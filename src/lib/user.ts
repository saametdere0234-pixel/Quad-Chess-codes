'use client';

import { v4 as uuidv4 } from 'uuid';

const USER_ID_KEY = 'quad-chess-user-id';
const NICKNAME_KEY = 'quad-chess-nickname';

export function getLocalUser() {
  if (typeof window === 'undefined') {
    return { userId: null, nickname: null };
  }
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = uuidv4();
    localStorage.setItem(USER_ID_KEY, userId);
  }
  const nickname = localStorage.getItem(NICKNAME_KEY);
  return { userId, nickname };
}

export function setLocalNickname(nickname: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(NICKNAME_KEY, nickname);
  }
}
