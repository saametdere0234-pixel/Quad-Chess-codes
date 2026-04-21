'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useCollection, useDatabase } from '@/firebase';
import { ref, push, serverTimestamp, query, orderByChild, limitToLast } from 'firebase/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';
import type { Player, PlayerId } from '@/lib/game/types';
import { Loader2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  text: string;
  createdAt: number;
}

interface ChatBoxProps {
  roomId: string;
  user: { userId: string; nickname: string; };
  roomPlayers: { [key: string]: { playerId: PlayerId, nickname: string, userId: string }};
  gamePlayers: Player[];
}

export default function ChatBox({ roomId, user, roomPlayers, gamePlayers }: ChatBoxProps) {
  const database = useDatabase();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatRef = useMemo(() => 
    database ? ref(database, `rooms/${roomId}/chat`) : null, 
    [database, roomId]
  );
  
  const chatQuery = useMemo(() => 
    chatRef ? query(chatRef, orderByChild('createdAt'), limitToLast(100)) : null,
    [chatRef]
  );

  const { data: messages, loading } = useCollection<ChatMessage>(chatQuery);
  
  const playerMetaMap = useMemo(() => {
    const map = new Map<string, { nickname: string; color: string }>();
    if (!roomPlayers || !gamePlayers) return map;

    for (const userId in roomPlayers) {
      const roomPlayer = roomPlayers[userId];
      const gamePlayer = gamePlayers.find(p => p.id === roomPlayer.playerId);
      if (gamePlayer) {
        map.set(userId, { nickname: roomPlayer.nickname, color: gamePlayer.color });
      }
    }
    return map;
  }, [roomPlayers, gamePlayers]);

  const handleSendMessage = async () => {
    if (newMessage.trim() === '' || !database || !chatRef || !user) return;

    const messageData = {
      userId: user.userId,
      nickname: user.nickname,
      text: newMessage.trim(),
      createdAt: serverTimestamp(),
    };

    try {
      await push(chatRef, messageData);
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Room Chat</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-48 w-full pr-4">
          <div className="space-y-2">
            {loading && <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin" /></div>}
            {messages && messages.length > 0 ? messages.map((msg) => {
              const playerMeta = playerMetaMap.get(msg.userId);
              const color = playerMeta?.color ?? '#A0A0A0'; // Muted grey for non-players
              const nickname = playerMeta?.nickname ?? msg.nickname;
              return (
                <div key={msg.id} className="text-sm">
                  <span style={{ color, fontWeight: 'bold' }}>{nickname}: </span>
                  <span>{msg.text}</span>
                </div>
              )
            }) : !loading && <p className="text-sm text-muted-foreground text-center">No messages yet.</p>}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>
        <div className="flex w-full items-center space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message..."
          />
          <Button onClick={handleSendMessage} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
