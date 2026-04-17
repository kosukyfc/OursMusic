import { useCallback, useState, useEffect } from 'react';

interface PartyMember {
  id: string;
  name: string;
  avatar?: string;
  isHost: boolean;
}

interface ListeningPartyState {
  partyCode: string;
  members: PartyMember[];
  isActive: boolean;
  hostId: string;
}

export function useListeningParty(userId: string) {
  const [party, setParty] = useState<ListeningPartyState | null>(null);
  const [votes, setVotes] = useState<Map<string, number>>(new Map());

  const generatePartyCode = useCallback(() => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }, []);

  const createParty = useCallback(() => {
    const code = generatePartyCode();
    const newParty: ListeningPartyState = {
      partyCode: code,
      members: [
        {
          id: userId,
          name: 'You',
          isHost: true,
        },
      ],
      isActive: true,
      hostId: userId,
    };
    setParty(newParty);
    localStorage.setItem('currentParty', JSON.stringify(newParty));
    return code;
  }, [userId, generatePartyCode]);

  const joinParty = useCallback((partyCode: string, memberName: string) => {
    // In production, would connect via Socket.IO
    setParty((prev) => {
      if (!prev || prev.partyCode !== partyCode) return prev;
      return {
        ...prev,
        members: [
          ...prev.members,
          {
            id: userId,
            name: memberName,
            isHost: false,
          },
        ],
      };
    });
  }, [userId]);

  const leaveParty = useCallback(() => {
    setParty(null);
    localStorage.removeItem('currentParty');
    setVotes(new Map());
  }, []);

  const voteForSong = useCallback((songId: string) => {
    setVotes((prev) => {
      const newVotes = new Map(prev);
      newVotes.set(songId, (newVotes.get(songId) || 0) + 1);
      return newVotes;
    });
  }, []);

  const getTopVotedSongs = useCallback(() => {
    return Array.from(votes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([songId, count]) => ({ songId, votes: count }));
  }, [votes]);

  const broadcastMessage = useCallback((message: string) => {
    // In production, would emit via Socket.IO
    console.log(`[Party ${party?.partyCode}] Message: ${message}`);
  }, [party]);

  // Load party from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('currentParty');
      if (saved) {
        setParty(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load party:', e);
    }
  }, []);

  return {
    party,
    createParty,
    joinParty,
    leaveParty,
    voteForSong,
    getTopVotedSongs,
    broadcastMessage,
  };
}
