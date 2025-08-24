import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './App.css';

function App() {
  const [currentMentor, setCurrentMentor] = useState('sarah');
  // Removed mode switching - everything is now chat-driven
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: 'Hi! I\'m Sarah Chen, your Excel mentor with 10+ years of business analysis experience. What Excel challenge can I help you with today?' 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [challengeStarted, setChallengeStarted] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(1);
  const [phaseCompleted, setPhaseCompleted] = useState({ 1: false, 2: false, 3: false });
  const [uploadedFile, setUploadedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [reviewInProgress, setReviewInProgress] = useState(false);
  const [showCurriculumUpload, setShowCurriculumUpload] = useState(false);
  const [curriculumUploaded, setCurriculumUploaded] = useState(false);
  const [curriculumContent, setCurriculumContent] = useState('');
  const [showChatInput, setShowChatInput] = useState(false);

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

  const startChallenge = () => {
    setChallengeStarted(true);
    setCurrentPhase(1);
    setPhaseCompleted({ 1: false, 2: false, 3: false });
    setMessages([
      {
        role: 'assistant',
        content: `Great! Let's begin the Excel challenge. I'm Sarah Chen, and I'll guide you through analyzing RetailCorp's e-commerce sales data.\n\n📋 **Phase 1: Data Cleaning (15 minutes)**\n\nFirst, download the sample dataset using the link above. Once you have the CSV file, open it in Excel and take a look at the data structure.\n\nI can see there are some data quality issues we need to address:\n- Missing email addresses for some customers\n- Missing customer ages in some records\n- Potential duplicate transactions\n\nStart by examining the data and tell me what data quality issues you notice. What's your plan for cleaning this dataset?`
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
      
      let contextualMessage = input;
      
      // Add curriculum context if available
      if (curriculumContent) {
        contextualMessage = `[CURRICULUM CONTEXT: ${curriculumContent.substring(0, 1000)}...] ${input}`;
      }
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: contextualMessage, mentor: currentMentor }),
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

  const handleCurriculumUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !file.name.endsWith('.md')) {
      alert('Please select a .md (markdown) file');
      return;
    }

    const formData = new FormData();
    formData.append('curriculum', file);
    formData.append('mentor', currentMentor);

    try {
      const response = await fetch('/api/upload-curriculum', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        setCurriculumContent(data.content);
        setCurriculumUploaded(true);
        setShowCurriculumUpload(false);
        setMessages([{
          role: 'assistant',
          content: `Perfect! I've loaded your curriculum "${data.title}". I'm now ready to provide guided learning experiences based on this content. How would you like to start learning?`
        }]);
      } else {
        alert('Failed to upload curriculum: ' + data.error);
      }
    } catch (error) {
      console.error('Curriculum upload error:', error);
      alert('Failed to upload curriculum. Please try again.');
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const submitWork = async () => {
    if (!uploadedFile) {
      alert('Please select a file to upload first.');
      return;
    }

    setSubmitting(true);
    setReviewInProgress(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('phase', currentPhase);
      formData.append('challengeType', 'excel');
      formData.append('mentor', currentMentor);

      const response = await fetch('/api/review-work', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        // Add Sarah's review to messages
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.review 
        }]);

        // If work is approved, advance to next phase
        if (data.approved) {
          setTimeout(() => {
            completePhase(currentPhase);
          }, 1000);
        }
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Sorry, I had trouble analyzing your file. Please try uploading again or ask me for help.' 
        }]);
      }
    } catch (error) {
      console.error('File upload error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Upload error: ${error.message}. Please try again.` 
      }]);
    }

    setSubmitting(false);
    setReviewInProgress(false);
    setUploadedFile(null);
  };

  const completePhase = (phaseNumber) => {
    setPhaseCompleted(prev => ({ ...prev, [phaseNumber]: true }));
    
    if (phaseNumber < 3) {
      const nextPhase = phaseNumber + 1;
      setCurrentPhase(nextPhase);
      
      let phaseMessage = '';
      if (nextPhase === 2) {
        phaseMessage = `Excellent work on Phase 1! 🎉 You've successfully cleaned the data. Now let's move to Phase 2.\n\n📊 **Phase 2: Analysis & Insights (20 minutes)**\n\nNow that we have clean data, let's extract meaningful business insights:\n\n1. Create a pivot table to analyze sales by product category and month\n2. Calculate key metrics like average order value and total revenue\n3. Identify top-performing products and customers\n4. Look for seasonal trends in the data\n\nDownload a fresh copy of the dataset and create your analysis. Upload your Excel file when ready for review.`;
      } else if (nextPhase === 3) {
        phaseMessage = `Outstanding analysis work! 🚀 You've uncovered some great insights. Time for the final phase.\n\n📈 **Phase 3: Visualization & Presentation (10 minutes)**\n\nLet's create compelling visualizations to present your findings:\n\n1. Build professional charts that clearly show your key findings\n2. Create an executive dashboard layout\n3. Prepare 3 key insights with supporting visuals\n\nCreate your visualizations and upload your final Excel dashboard when ready.`;
      }
      
      setMessages(prev => [...prev, { role: 'assistant', content: phaseMessage }]);
    } else {
      // Challenge completed
      const completionMessage = `🏆 **Challenge Complete!** Congratulations!\n\nYou've successfully completed the Excel e-commerce analysis challenge! You've demonstrated skills in:\n\n✅ Data cleaning and quality assessment\n✅ Advanced Excel analysis with pivot tables\n✅ Professional data visualization\n✅ Business insight generation\n\nYour analysis of RetailCorp's sales data would definitely impress the leadership team. These are exactly the skills that make data analysts valuable in real business scenarios.\n\nReady for more challenges? Try the SQL challenge next to expand your data skills!`;
      
      setMessages(prev => [...prev, { role: 'assistant', content: completionMessage }]);
    }
  };

  return (
    <div className="App">
      <header className="chat-header">
        <h1>📊 DataMentor AI</h1>
        <p>Chat with {mentors[currentMentor].name} - {mentors[currentMentor].expertise} Expert</p>
        {!curriculumUploaded && (
          <div className="curriculum-setup-prompt">
            <button 
              onClick={() => setShowCurriculumUpload(true)}
              className="setup-curriculum-button"
            >
              🎓 Setup Learning Experience
            </button>
          </div>
        )}
      </header>
      
      {showCurriculumUpload && (
        <div className="curriculum-upload-modal">
          <div className="curriculum-upload-container">
            <h2>Set up a new Learning Experience with {mentors[currentMentor].name}</h2>
            <div className="upload-section">
              <h3>Upload learning content as .md files</h3>
              <p>Upload your structured markdown curriculum file to give {mentors[currentMentor].name} the context needed for guided learning.</p>
              
              <div className="file-upload-area">
                <input
                  type="file"
                  accept=".md"
                  onChange={handleCurriculumUpload}
                  className="curriculum-file-input"
                  id="curriculum-upload"
                />
                <label htmlFor="curriculum-upload" className="curriculum-upload-button">
                  📁 Choose .md file to upload
                </label>
              </div>
              
              <button 
                onClick={() => setShowCurriculumUpload(false)}
                className="cancel-upload-button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
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
      
      {/* Unified chat experience */}
      <div className="chat-container">
        <div className="messages">
          {messages.map((message, index) => {
            // Detect if this is a detailed review (contains multiple sections/headers)
            const isDetailedReview = message.role === 'assistant' && 
              (message.content.includes('###') || message.content.includes('##') || 
               message.content.length > 500);
            
            return (
              <>
                <div key={index} className={`message ${message.role}`}>
                  <div className={`message-content ${isDetailedReview ? 'wide-review' : ''}`}>
                    {message.role === 'assistant' ? (
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
                {/* Show guided learning buttons after Sarah's welcome message when curriculum is loaded */}
                {message.role === 'assistant' && index === messages.length - 1 && curriculumUploaded && (
                  <div className="guided-learning-buttons">
                    <button 
                      className="learning-option-button"
                      onClick={() => setShowChatInput(false)}
                    >
                      Learn Something New
                    </button>
                    <button 
                      className="learning-option-button"
                      onClick={() => setShowChatInput(false)}
                    >
                      Practice a new Scenarios
                    </button>
                    <button 
                      className="learning-option-button"
                      onClick={() => setShowChatInput(false)}
                    >
                      Take a Challenge
                    </button>
                    <button 
                      className="learning-option-button"
                      onClick={() => setShowChatInput(true)}
                    >
                      Anything else
                    </button>
                  </div>
                )}
              </>
            );
          })}
          {loading && (
            <div className="message assistant">
              <div className="message-content">
                Sarah is thinking...
              </div>
            </div>
          )}
        </div>
        
        {/* Only show chat input when curriculum is not uploaded OR when "Anything else" is clicked */}
        {(!curriculumUploaded || showChatInput) && (
          <div className="input-container">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder=""
              className="message-input"
            />
            <button onClick={sendMessage} disabled={loading} className="send-button">
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
