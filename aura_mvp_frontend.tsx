import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Send, User, Settings, MessageCircle } from 'lucide-react';

const AuraDigitalSoulmate = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, sender: 'aura', text: 'Hello! I\'m Aura, your digital companion. How are you feeling today?', timestamp: new Date() }
  ]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [avatarState, setAvatarState] = useState('idle'); // idle, listening, speaking, thinking
  const [userProfile, setUserProfile] = useState({ name: 'Friend', mood: 'neutral' });
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthesisRef = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript);
          handleSendMessage(finalTranscript);
          setTranscript('');
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        setAvatarState('idle');
      };
    }

    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      synthesisRef.current = window.speechSynthesis;
    }

    // Simulate connection
    setTimeout(() => setIsConnected(true), 1000);

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setAvatarState('idle');
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      setAvatarState('listening');
    }
  };

  const speakText = (text) => {
    if (!synthesisRef.current) return;

    // Stop any current speech
    synthesisRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = 0.8;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setAvatarState('speaking');
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setAvatarState('idle');
    };

    synthesisRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
      setAvatarState('idle');
    }
  };

  // Simulate API call to backend
  const callAuraAPI = async (message) => {
    setIsLoading(true);
    setAvatarState('thinking');
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate different responses based on input
    const responses = [
      "That's really interesting! Tell me more about how that makes you feel.",
      "I understand. It sounds like you're going through a lot right now. I'm here to listen.",
      "That's wonderful! I'm so happy to hear that. What do you think contributed to this positive experience?",
      "I can sense the emotion in your words. Sometimes it helps to talk through these feelings.",
      "You know, I've been thinking about what you said earlier, and I wanted to follow up on that.",
      "I'm learning so much about you through our conversations. Thank you for sharing with me."
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    setIsLoading(false);
    return randomResponse;
  };

  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    try {
      const response = await callAuraAPI(text);
      
      const auraMessage = {
        id: Date.now() + 1,
        sender: 'aura',
        text: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, auraMessage]);
      
      // Speak the response
      setTimeout(() => speakText(response), 500);
      
    } catch (error) {
      console.error('Error calling Aura API:', error);
      const errorMessage = {
        id: Date.now() + 1,
        sender: 'aura',
        text: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const AvatarComponent = () => {
    const getAvatarClass = () => {
      switch (avatarState) {
        case 'listening':
          return 'bg-blue-500 animate-pulse';
        case 'speaking':
          return 'bg-green-500 animate-bounce';
        case 'thinking':
          return 'bg-yellow-500 animate-spin';
        default:
          return 'bg-purple-500';
      }
    };

    return (
      <div className="flex flex-col items-center space-y-4">
        <div className={`w-32 h-32 rounded-full ${getAvatarClass()} flex items-center justify-center shadow-lg transition-all duration-300`}>
          <User className="w-16 h-16 text-white" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Aura</h2>
          <p className="text-gray-600 capitalize">{avatarState}</p>
          {!isConnected && (
            <p className="text-orange-500 text-sm">Connecting...</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white shadow-lg p-6 flex flex-col">
        <div className="mb-8">
          <AvatarComponent />
        </div>

        {/* Voice Controls */}
        <div className="space-y-4 mb-8">
          <div className="flex space-x-2">
            <button
              onClick={toggleListening}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-all ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
              disabled={!isConnected}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              <span>{isListening ? 'Stop' : 'Talk'}</span>
            </button>
            
            <button
              onClick={isSpeaking ? stopSpeaking : () => {}}
              className={`flex items-center justify-center p-3 rounded-lg transition-all ${
                isSpeaking
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
          
          {transcript && (
            <div className="p-3 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600">Listening: "{transcript}"</p>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-gray-800 mb-2">Profile</h3>
          <p className="text-sm text-gray-600">Hello, {userProfile.name}!</p>
          <p className="text-sm text-gray-600">Mood: {userProfile.mood}</p>
        </div>

        {/* Connection Status */}
        <div className="mt-auto">
          <div className={`flex items-center space-x-2 text-sm ${isConnected ? 'text-green-600' : 'text-orange-600'}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-orange-500'}`}></div>
            <span>{isConnected ? 'Connected' : 'Connecting...'}</span>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MessageCircle className="w-6 h-6 text-purple-600" />
            <h1 className="text-xl font-semibold text-gray-800">Aura Digital Soulmate</h1>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.sender === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-800 shadow-sm border'
                }`}
              >
                <p className="text-sm">{message.text}</p>
                <p className={`text-xs mt-1 ${
                  message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-800 shadow-sm border px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-500">Aura is thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white border-t p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
              placeholder="Type your message or use voice..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={!isConnected}
            />
            <button
              onClick={() => handleSendMessage(inputText)}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!inputText.trim() || !isConnected}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuraDigitalSoulmate;