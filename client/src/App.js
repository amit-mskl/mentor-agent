import React, { useState } from 'react';
import './App.css';

function App() {
  const [currentMentor, setCurrentMentor] = useState('sarah');
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: 'Hi! I\'m Sarah Chen, your Excel mentor with 10+ years of business analysis experience. What Excel challenge can I help you with today?' 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const mentors = {
    'sarah': { name: 'Sarah Chen', expertise: 'Excel', welcome: 'Hi! I\'m Sarah Chen, your Excel mentor with 10+ years of business analysis experience. What Excel challenge can I help you with today?' },
    'marcus': { name: 'Marcus Rodriguez', expertise: 'SQL', welcome: 'Hello! I\'m Marcus Rodriguez, a senior data engineer with 8+ years of database experience. I\'m here to help you master SQL queries, optimization, and database design. What SQL challenge are you working on?' }
  };

  const switchMentor = (mentorId) => {
    setCurrentMentor(mentorId);
    setMessages([
      {
        role: 'assistant',
        content: mentors[mentorId].welcome
      }
    ]);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      console.log('Sending request to backend...');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input, mentor: currentMentor }),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: `Connection error: ${error.message}` }]);
    }

    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="App">
      <header className="chat-header">
        <h1>📊 DataMentor AI</h1>
        <p>Chat with {mentors[currentMentor].name} - {mentors[currentMentor].expertise} Expert</p>
      </header>
      
      <div className="mentor-selector">
        <label htmlFor="mentor-select">Choose your mentor:</label>
        <select 
          id="mentor-select"
          value={currentMentor} 
          onChange={(e) => switchMentor(e.target.value)}
          className="mentor-dropdown"
        >
          <option value="sarah">Sarah Chen (Excel)</option>
          <option value="marcus">Marcus Rodriguez (SQL)</option>
        </select>
      </div>
      
      <div className="chat-container">
        <div className="messages">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              <div className="message-content">
                {message.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="message assistant">
              <div className="message-content">
                Sarah is thinking...
              </div>
            </div>
          )}
        </div>
        
        <div className="input-container">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Sarah about Excel formulas, pivot tables, data analysis..."
            className="message-input"
          />
          <button onClick={sendMessage} disabled={loading} className="send-button">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
