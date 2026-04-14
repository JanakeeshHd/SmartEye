import { Router } from 'express';

const router = Router();

// Chatbot proxy - forwards to AI service or uses rule-based fallback
const chatbotResponses = {
  greetings: ['hello', 'hi', 'hey', 'good morning', 'good evening'],
  reportHelp: ['report', 'complaint', 'issue', 'problem', 'file', 'submit'],
  statusHelp: ['status', 'track', 'where', 'update', 'progress'],
  categories: ['type', 'category', 'kind', 'what can'],
  general: ['help', 'how', 'what']
};

const getResponse = (message) => {
  const lower = message.toLowerCase();

  if (chatbotResponses.greetings.some(w => lower.includes(w))) {
    return {
      text: "👋 Hello! I'm Smarteye Assistant. I can help you:\n\n• **Report a civic issue** (potholes, garbage, leaks, etc.)\n• **Track your complaint** status\n• **Find nearby issues** on the map\n• **Answer questions** about the platform\n\nWhat would you like to do?",
      suggestions: ['Report an issue', 'Track my complaint', 'View map']
    };
  }

  if (chatbotResponses.reportHelp.some(w => lower.includes(w))) {
    return {
      text: "📝 To report an issue:\n\n1. Click **'Report Issue'** in the navigation\n2. Take a photo or upload an image\n3. Describe the problem (you can also use voice input 🎤)\n4. Allow GPS to detect your location\n5. Our AI will auto-detect the issue type and priority\n6. Submit!\n\nYou'll receive a tracking ID to monitor progress.",
      suggestions: ['What categories are available?', 'How long does resolution take?']
    };
  }

  if (chatbotResponses.statusHelp.some(w => lower.includes(w))) {
    return {
      text: "📊 To track your complaint:\n\n1. Go to **'My Issues'** in the menu\n2. Find your issue by ID or title\n3. Status will show: **Submitted → In Progress → Resolved**\n\nYou'll also receive real-time notifications when status changes!",
      suggestions: ['Report an issue', 'View all issues on map']
    };
  }

  if (chatbotResponses.categories.some(w => lower.includes(w))) {
    return {
      text: "🏷️ We handle these civic issue categories:\n\n• 🕳️ **Potholes** - Road damage, cracks\n• 🗑️ **Garbage** - Waste, littering, dumping\n• 💧 **Water Leakage** - Pipe bursts, flooding\n• 💡 **Broken Streetlights** - Dark areas, damaged lights\n• 🌊 **Drainage** - Blocked drains, sewer issues\n• ⚡ **Electricity** - Power outages, exposed wires\n• 🛣️ **Road Damage** - General road issues",
      suggestions: ['Report an issue', 'How does AI detection work?']
    };
  }

  return {
    text: "🤖 I can help you with:\n\n• **Reporting civic issues** with AI-powered detection\n• **Tracking complaint status** in real-time\n• **Viewing issues on a map** near your location\n• **Understanding issue categories** and priorities\n\nTry asking me something specific!",
    suggestions: ['How to report?', 'Track my issue', 'What categories?']
  };
};

router.post('/', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    // Try AI service first
    try {
      const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
      const response = await fetch(`${aiUrl}/api/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        const data = await response.json();
        return res.json(data);
      }
    } catch (err) {
      // AI service unavailable, use fallback
    }

    const response = getResponse(message);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Chatbot failed.' });
  }
});

export default router;
