require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Anthropic } = require('@anthropic-ai/sdk');
const app = express();
const PORT = process.env.PORT || 4000;

console.log('API Key loaded:', process.env.ANTHROPIC_API_KEY ? 'Yes' : 'No');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ 
    message: 'DataMentor AI Platform',
    status: 'Server running successfully',
    version: '1.0.0'
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, mentor = 'sarah' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Define mentor prompts
    const mentorPrompts = {
      'sarah': 'You are Sarah Chen, an experienced Excel mentor with 10+ years of business analysis experience. You specialize in Excel formulas, pivot tables, data visualization, and business reporting. Provide practical, step-by-step guidance with real-world examples.',
      'marcus': 'You are Marcus Rodriguez, a senior data engineer with 8+ years of database experience. You specialize in SQL query optimization, database design, and performance tuning. Focus on best practices, efficient queries, and scalable solutions. Explain concepts clearly and always consider performance implications.'
    };

    const mentorNames = {
      'sarah': 'Sarah Chen',
      'marcus': 'Marcus Rodriguez'
    };

    const selectedPrompt = mentorPrompts[mentor] || mentorPrompts['sarah'];
    const selectedName = mentorNames[mentor] || mentorNames['sarah'];

    console.log(`Attempting API call with ${selectedName} for message:`, message);
    
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `${selectedPrompt}\n\nUser question: ${message}`
      }]
    });

    console.log('API response received:', response);

    res.json({ 
      mentor: selectedName,
      response: response.content[0].text 
    });
  } catch (error) {
    console.error('Detailed Error:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error type:', error.constructor.name);
    if (error.status) console.error('HTTP Status:', error.status);
    res.status(500).json({ error: 'Failed to get mentor response', details: error.message });
  }
});

const server = app.listen(PORT, () => {
  console.log(`DataMentor AI server running on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}`);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});