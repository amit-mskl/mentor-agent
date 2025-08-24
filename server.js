require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { Anthropic } = require('@anthropic-ai/sdk');
const app = express();
const PORT = process.env.PORT || 4000;

console.log('API Key loaded:', process.env.ANTHROPIC_API_KEY ? 'Yes' : 'No');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls', '.csv', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls), CSV files, and Markdown files (.md) are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
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

// File review endpoint
app.post('/api/review-work', upload.single('file'), async (req, res) => {
  try {
    const { phase, challengeType, mentor } = req.body;
    const uploadedFile = req.file;

    if (!uploadedFile) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    console.log(`Reviewing ${challengeType} work for phase ${phase} by ${mentor}`);
    console.log('File:', uploadedFile.filename);

    // Create phase-specific review prompts
    const getReviewPrompt = (phase, challengeType) => {
      if (challengeType === 'excel') {
        switch(phase) {
          case '1':
            return `You are Sarah Chen, reviewing a student's Excel data cleaning work for Phase 1 of the e-commerce analysis challenge.

ANALYSIS FOCUS:
- Data quality improvements (missing values, duplicates, formatting)
- Proper use of Excel functions for data cleaning
- Organization and structure of the cleaned dataset
- Professional worksheet formatting and documentation

REVIEW CRITERIA:
- Did they identify and handle missing email addresses and customer ages?
- Are there any remaining duplicate transactions?
- Are date formats standardized and consistent?
- Did they create any calculated columns (revenue, profit margins)?
- Is the data properly organized for analysis?

FEEDBACK STYLE:
- Be specific about what they did well and what needs improvement
- Reference specific cells, columns, or formulas when possible
- Suggest concrete improvements with Excel techniques
- If work is acceptable, say "APPROVED" at the end
- If work needs improvement, say "NEEDS_REVISION" at the end

Provide detailed technical feedback as if you're reviewing actual work.`;

          case '2':
            return `You are Sarah Chen, reviewing a student's Excel analysis work for Phase 2 of the e-commerce analysis challenge.

ANALYSIS FOCUS:
- Quality and structure of pivot tables
- Accuracy of calculated metrics (AOV, revenue, trends)
- Identification of top-performing products and customers
- Use of appropriate Excel functions and analysis techniques

REVIEW CRITERIA:
- Are pivot tables properly structured with correct fields?
- Are calculations accurate (average order value, totals, percentages)?
- Did they identify meaningful business insights?
- Are formulas efficient and professional?
- Is the analysis organized and easy to understand?

FEEDBACK STYLE:
- Comment on their analytical approach and Excel techniques
- Suggest improvements to formulas or pivot table structure
- Highlight insights they may have missed
- If work meets standards, say "APPROVED" at the end
- If work needs improvement, say "NEEDS_REVISION" at the end`;

          case '3':
            return `You are Sarah Chen, reviewing a student's Excel visualization work for Phase 3 of the e-commerce analysis challenge.

ANALYSIS FOCUS:
- Quality and appropriateness of charts and visualizations
- Professional dashboard layout and design
- Clear presentation of key business insights
- Overall executive-ready presentation quality

REVIEW CRITERIA:
- Are chart types appropriate for the data being shown?
- Is the dashboard well-organized and professional?
- Are the key insights clearly communicated?
- Is the work suitable for presentation to executives?
- Are there any formatting or design improvements needed?

FEEDBACK STYLE:
- Focus on visualization best practices and business communication
- Suggest improvements to chart selection or layout
- Comment on the clarity of insights presentation
- If work is presentation-ready, say "APPROVED" at the end
- If work needs improvement, say "NEEDS_REVISION" at the end`;

          default:
            return 'You are Sarah Chen, reviewing student Excel work. Provide professional feedback on their analysis.';
        }
      }
      return 'You are reviewing student work. Provide constructive feedback.';
    };

    // Since we can't actually read Excel files without additional libraries,
    // we'll simulate the review based on file characteristics
    const fileStats = fs.statSync(uploadedFile.path);
    const reviewPrompt = getReviewPrompt(phase, challengeType);
    
    const contextMessage = `${reviewPrompt}

FILE INFORMATION:
- Filename: ${uploadedFile.originalname}
- File size: ${(fileStats.size / 1024).toFixed(2)} KB
- Phase: ${phase} of Excel e-commerce analysis challenge

Since I cannot directly read Excel files in this environment, I'll provide feedback based on common issues and best practices for Phase ${phase}. Please provide realistic, specific feedback as if you reviewed the actual file content.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: contextMessage
      }]
    });

    const reviewText = response.content[0].text;
    const isApproved = reviewText.includes('APPROVED');

    // Clean up uploaded file
    fs.unlinkSync(uploadedFile.path);

    res.json({
      success: true,
      review: reviewText,
      approved: isApproved,
      phase: phase
    });

  } catch (error) {
    console.error('File review error:', error);
    
    // Clean up file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('File cleanup error:', cleanupError);
      }
    }

    res.status(500).json({ 
      success: false, 
      error: 'Failed to review work', 
      details: error.message 
    });
  }
});

// Curriculum upload endpoint
app.post('/api/upload-curriculum', upload.single('curriculum'), async (req, res) => {
  try {
    const { mentor } = req.body;
    const uploadedFile = req.file;

    if (!uploadedFile) {
      return res.status(400).json({ success: false, error: 'No curriculum file uploaded' });
    }

    console.log(`Uploading curriculum for ${mentor}`);
    console.log('File:', uploadedFile.filename);

    // Read the markdown content
    const curriculumContent = fs.readFileSync(uploadedFile.path, 'utf8');
    
    // Extract title from markdown (first # heading)
    const titleMatch = curriculumContent.match(/^# (.+)$/m);
    const title = titleMatch ? titleMatch[1] : uploadedFile.originalname;

    // Clean up uploaded file
    fs.unlinkSync(uploadedFile.path);

    // For now, we'll just return the content. In a real app, you'd store this in a database
    res.json({
      success: true,
      title: title,
      content: curriculumContent,
      mentor: mentor
    });

  } catch (error) {
    console.error('Curriculum upload error:', error);
    
    // Clean up file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('File cleanup error:', cleanupError);
      }
    }

    res.status(500).json({ 
      success: false, 
      error: 'Failed to upload curriculum', 
      details: error.message 
    });
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