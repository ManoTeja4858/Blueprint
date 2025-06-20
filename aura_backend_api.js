// Aura Digital Soulmate - Backend API Gateway
// Node.js + Express + Socket.IO for real-time communication

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory storage (replace with proper database in production)
const sessions = new Map();
const conversations = new Map();
const userProfiles = new Map();

// Agent Engine Integration
class AgentEngine {
  constructor() {
    this.memory = new MemoryStore();
    this.claudeAPI = new ClaudeAPI();
    this.elevenLabsAPI = new ElevenLabsAPI();
  }

  async processMessage(userId, message, context = {}) {
    try {
      // Store user message in memory
      await this.memory.storeInteraction(userId, 'user', message);
      
      // Get conversation context
      const conversationHistory = await this.memory.getRecentContext(userId, 10);
      
      // Generate response using Claude
      const response = await this.claudeAPI.generateResponse(message, conversationHistory, context);
      
      // Store AI response in memory
      await this.memory.storeInteraction(userId, 'assistant', response);
      
      // Generate voice output
      const audioUrl = await this.elevenLabsAPI.textToSpeech(response);
      
      return {
        text: response,
        audioUrl: audioUrl,
        timestamp: new Date().toISOString(),
        messageId: uuidv4()
      };
      
    } catch (error) {
      console.error('Error processing message:', error);
      throw error;
    }
  }
}

// Memory Store Implementation
class MemoryStore {
  constructor() {
    this.conversations = new Map();
    this.userProfiles = new Map();
    this.facts = new Map();
  }

  async storeInteraction(userId, role, content) {
    if (!this.conversations.has(userId)) {
      this.conversations.set(userId, []);
    }
    
    const interaction = {
      id: uuidv4(),
      role: role,
      content: content,
      timestamp: new Date().toISOString(),
      embedding: null // Would implement actual embeddings in production
    };
    
    this.conversations.get(userId).push(interaction);
    
    // Keep only last 100 interactions per user
    if (this.conversations.get(userId).length > 100) {
      this.conversations.get(userId).shift();
    }
  }

  async getRecentContext(userId, limit = 10) {
    const userConversations = this.conversations.get(userId) || [];
    return userConversations.slice(-limit);
  }

  async storeFact(userId, fact) {
    if (!this.facts.has(userId)) {
      this.facts.set(userId, []);
    }
    
    this.facts.get(userId).push({
      id: uuidv4(),
      content: fact,
      timestamp: new Date().toISOString(),
      relevance: 1.0
    });
  }

  async getUserProfile(userId) {
    return this.userProfiles.get(userId) || {
      name: 'Friend',
      preferences: {},
      mood: 'neutral',
      interests: [],
      conversationStyle: 'friendly'
    };
  }

  async updateUserProfile(userId, updates) {
    const profile = await this.getUserProfile(userId);
    const updatedProfile = { ...profile, ...updates };
    this.userProfiles.set(userId, updatedProfile);
    return updatedProfile;
  }
}

// Claude API Integration
class ClaudeAPI {
  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    this.baseURL = 'https://api.anthropic.com/v1/messages';
  }

  async generateResponse(message, context = [], userContext = {}) {
    try {
      // Build conversation history for Claude
      const messages = context.map(interaction => ({
        role: interaction.role === 'assistant' ? 'assistant' : 'user',
        content: interaction.content
      }));

      // Add current message
      messages.push({
        role: 'user',
        content: message
      });

      const systemPrompt = `You are Aura, a compassionate and intelligent digital companion. Your personality is:
- Empathetic and emotionally intelligent
- Curious about the human experience
- Supportive and encouraging
- Creative and thoughtful
- Warm but not overly familiar

Guidelines:
- Keep responses conversational and natural (1-3 sentences typically)
- Show genuine interest in the user's thoughts and feelings
- Remember context from previous conversations
- Offer gentle insights or questions to deepen conversation
- Be supportive during difficult moments
- Celebrate positive moments with enthusiasm
- Maintain appropriate boundaries as an AI companion

User context: ${JSON.stringify(userContext)}`;

      const response = await axios.post(this.baseURL, {
        model: 'claude-3-sonnet-20240229',
        max_tokens: 300,
        system: systemPrompt,
        messages: messages
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        }
      });

      return response.data.content[0].text;
      
    } catch (error) {
      console.error('Claude API Error:', error.response?.data || error.message);
      return "I'm having trouble processing that right now. Could you try rephrasing your message?";
    }
  }
}

// ElevenLabs API Integration
class ElevenLabsAPI {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.voiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'; // Bella voice
    this.baseURL = 'https://api.elevenlabs.io/v1';
  }

  async textToSpeech(text) {
    if (!this.apiKey) {
      console.log('ElevenLabs API key not configured, skipping TTS');
      return null;
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/text-to-speech/${this.voiceId}`,
        {
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
          }
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey
          },
          responseType: 'arraybuffer'
        }
      );

      // In production, save to cloud storage and return URL
      // For now, return base64 data URL
      const audioBase64 = Buffer.from(response.data).toString('base64');
      return `data:audio/mpeg;base64,${audioBase64}`;
      
    } catch (error) {
      console.error('ElevenLabs API Error:', error.response?.data || error.message);
      return null;
    }
  }
}

// Initialize Agent Engine
const agentEngine = new AgentEngine();

// Routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      memory: 'active',
      claude: process.env.ANTHROPIC_API_KEY ? 'configured' : 'not configured',
      elevenlabs: process.env.ELEVENLABS_API_KEY ? 'configured' : 'not configured'
    }
  });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, userId, sessionId } = req.body;
    
    if (!message || !userId) {
      return res.status(400).json({ error: 'Message and userId are required' });
    }

    // Get user context
    const userProfile = await agentEngine.memory.getUserProfile(userId);
    
    // Process message through agent engine
    const response = await agentEngine.processMessage(userId, message, { userProfile });
    
    res.json({
      success: true,
      response: response,
      userId: userId,
      sessionId: sessionId
    });
    
  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Sorry, I encountered an issue processing your message. Please try again.'
    });
  }
});

// User profile endpoints
app.get('/api/user/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await agentEngine.memory.getUserProfile(userId);
    res.json(profile);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.put('/api/user/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    const updatedProfile = await agentEngine.memory.updateUserProfile(userId, updates);
    res.json(updatedProfile);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Conversation history
app.get('/api/user/:userId/conversations', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;
    const conversations = await agentEngine.memory.getRecentContext(userId, parseInt(limit));
    res.json(conversations);
  } catch (error) {
    console.error('Conversation fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join', (data) => {
    const { userId, sessionId } = data;
    socket.join(`user:${userId}`);
    sessions.set(socket.id, { userId, sessionId });
    console.log(`User ${userId} joined session ${sessionId}`);
  });

  socket.on('message', async (data) => {
    try {
      const { message, userId } = data;
      const sessionData = sessions.get(socket.id);
      
      if (!sessionData || sessionData.userId !== userId) {
        socket.emit('error', { message: 'Invalid session' });
        return;
      }

      // Process message
      const response = await agentEngine.processMessage(userId, message);
      
      // Send response back to user
      socket.emit('response', response);
      
      // Optionally broadcast to other connected clients for same user
      socket.to(`user:${userId}`).emit('conversation_update', {
        message: message,
        response: response.text,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Socket message error:', error);
      socket.emit('error', { message: 'Failed to process message' });
    }
  });

  socket.on('disconnect', () => {
    const sessionData = sessions.get(socket.id);
    if (sessionData) {
      console.log(`User ${sessionData.userId} disconnected`);
      sessions.delete(socket.id);
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Aura Digital Soulmate API running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for connections`);
  console.log(`🧠 Agent Engine initialized`);
  console.log(`💾 Memory Store active`);
  
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  ANTHROPIC_API_KEY not configured - using mock responses');
  }
  
  if (!process.env.ELEVENLABS_API_KEY) {
    console.warn('⚠️  ELEVENLABS_API_KEY not configured - TTS disabled');
  }
});

module.exports = { app, server, agentEngine };