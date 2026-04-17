import { useState, useCallback } from 'react';

interface VoiceCommand {
  command: string;
  action: () => void;
}

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

export const useVoiceCommands = (commands: VoiceCommand[]) => {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startListening = useCallback(() => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setError('Speech Recognition não suportado');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        setLastCommand(transcript);

        const matched = commands.find(cmd => transcript.includes(cmd.command.toLowerCase()));
        if (matched) {
          matched.action();
        }
      };

      recognition.onerror = (event: any) => {
        setError(`Erro: ${event.error}`);
      };

      recognition.start();
    } catch (err) {
      setError('Erro ao iniciar reconhecimento de voz');
    }
  }, [commands]);

  const stopListening = useCallback(() => {
    setIsListening(false);
  }, []);

  return {
    isListening,
    lastCommand,
    error,
    startListening,
    stopListening,
  };
};
