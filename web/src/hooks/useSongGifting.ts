import { useCallback, useState } from 'react';

interface Gift {
  id: string;
  songId: string;
  songTitle: string;
  fromUserId: string;
  fromUserName: string;
  toUserEmail: string;
  message: string;
  sentAt: number;
}

export function useSongGifting(userId: string) {
  const [receivedGifts, setReceivedGifts] = useState<Gift[]>([]);
  const [sentGifts, setSentGifts] = useState<Gift[]>([]);

  const sendGift = useCallback(
    (songId: string, songTitle: string, recipientEmail: string, message: string) => {
      const gift: Gift = {
        id: `gift-${Date.now()}`,
        songId,
        songTitle,
        fromUserId: userId,
        fromUserName: 'You',
        toUserEmail: recipientEmail,
        message,
        sentAt: Date.now(),
      };

      setSentGifts((prev) => [gift, ...prev]);

      // In production, would send to backend/email service
      console.log(`Gift sent to ${recipientEmail}:`, gift);

      // Simulate backend notification
      localStorage.setItem(
        `giftNotification-${recipientEmail}`,
        JSON.stringify({
          message: `${gift.fromUserName} te presenteou ${songTitle}!`,
          timestamp: Date.now(),
        })
      );
    },
    [userId]
  );

  const receiveGift = useCallback((gift: Gift) => {
    setReceivedGifts((prev) => [gift, ...prev]);
  }, []);

  const getReceivedGifts = useCallback(() => {
    return receivedGifts;
  }, [receivedGifts]);

  const getSentGifts = useCallback(() => {
    return sentGifts;
  }, [sentGifts]);

  const removeGift = useCallback((giftId: string) => {
    setReceivedGifts((prev) => prev.filter((g) => g.id !== giftId));
  }, []);

  const getGiftStats = useCallback(() => {
    return {
      receivedCount: receivedGifts.length,
      sentCount: sentGifts.length,
      mostGifted: sentGifts.reduce((acc, gift) => {
        const existing = acc.find((g) => g.songId === gift.songId);
        if (existing) {
          existing.count += 1;
        } else {
          acc.push({ songId: gift.songId, songTitle: gift.songTitle, count: 1 });
        }
        return acc;
      }, [] as Array<{ songId: string; songTitle: string; count: number }>),
    };
  }, [receivedGifts, sentGifts]);

  return {
    receivedGifts,
    sentGifts,
    sendGift,
    receiveGift,
    getReceivedGifts,
    getSentGifts,
    removeGift,
    getGiftStats,
  };
}
