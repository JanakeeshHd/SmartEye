import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { emitRealtimeEvent, notifyUser } from '../services/notificationService.js';

const CATEGORIES = ['pothole', 'garbage', 'water-leakage', 'broken-streetlight', 'drainage', 'electricity', 'road-damage', 'other'];
const DEPARTMENTS = {
  'pothole': 'Roads & Infrastructure',
  'garbage': 'Sanitation & Waste',
  'water-leakage': 'Water Supply',
  'broken-streetlight': 'Electrical & Lighting',
  'drainage': 'Drainage & Sewage',
  'electricity': 'Electrical & Lighting',
  'road-damage': 'Roads & Infrastructure',
  'other': 'General Maintenance'
};

const callAIService = async (data, endpoint) => {
  try {
    const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${aiUrl}/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (response.ok) return await response.json();
    return null;
  } catch (err) {
    console.log(`AI service (${endpoint}) unavailable, using fallback`);
    return null;
  }
};

const fallbackClassify = (text) => {
  const lower = (text || '').toLowerCase();
  const keywords = {
    'pothole': ['pothole', 'pit', 'hole in road', 'road damage', 'crater', 'bump'],
    'garbage': ['garbage', 'trash', 'waste', 'dump', 'litter', 'rubbish', 'debris', 'dirty'],
    'water-leakage': ['water', 'leak', 'pipe', 'flooding', 'sewage', 'overflow', 'burst'],
    'broken-streetlight': ['streetlight', 'light', 'lamp', 'dark', 'bulb', 'illumination'],
    'drainage': ['drain', 'drainage', 'clog', 'blocked', 'sewer', 'manhole'],
    'electricity': ['electric', 'power', 'wire', 'cable', 'outage', 'spark'],
    'road-damage': ['road', 'crack', 'broken road', 'asphalt', 'pavement']
  };

  let bestCategory = 'other';
  let maxScore = 0;

  for (const [category, words] of Object.entries(keywords)) {
    const score = words.filter(w => lower.includes(w)).length;
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  }

  return { category: bestCategory, confidence: Math.min(0.5 + maxScore * 0.15, 0.95) };
};

const fallbackPriority = (category, text) => {
  const urgentWords = ['dangerous', 'urgent', 'emergency', 'critical', 'severe', 'accident', 'hazard', 'risk', 'injury', 'flood'];
  const lower = (text || '').toLowerCase();
  let score = 50;
  
  const highPriority = ['pothole', 'water-leakage', 'electricity'];
  if (highPriority.includes(category)) score += 15;
  
  const urgentCount = urgentWords.filter(w => lower.includes(w)).length;
  score += urgentCount * 10;
  
  return Math.min(Math.max(score, 10), 100);
};

export const createIssue = async (req, res) => {
  try {
    const { title, description, category, latitude, longitude, address } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Description is required.' });
    }

    // Process uploaded images
    const images = (req.files || []).map(f => `/uploads/${f.filename}`);

    // Try AI classification
    let aiAnalysis = await callAIService({ text: description, images }, 'analyze-text');
    
    if (!aiAnalysis) {
      const fallback = fallbackClassify(description);
      aiAnalysis = {
        category: category || fallback.category,
        confidence: fallback.confidence,
        severity: fallbackPriority(category || fallback.category, description) > 70 ? 'high' : fallbackPriority(category || fallback.category, description) > 40 ? 'medium' : 'low'
      };
    }

    const finalCategory = category || aiAnalysis.category || 'other';
    const priorityScore = fallbackPriority(finalCategory, description);
    const severity = priorityScore > 70 ? 'high' : priorityScore > 40 ? 'medium' : 'low';
    const department = DEPARTMENTS[finalCategory] || 'General Maintenance';

    // Check duplicates
    let duplicateOf = null;
    if (latitude && longitude) {
      const nearby = await db.issues.find({
        'location.lat': { $gte: parseFloat(latitude) - 0.001, $lte: parseFloat(latitude) + 0.001 },
        'location.lng': { $gte: parseFloat(longitude) - 0.001, $lte: parseFloat(longitude) + 0.001 },
        category: finalCategory,
        status: { $ne: 'resolved' }
      });
      if (nearby.length > 0) {
        duplicateOf = nearby[0]._id;
      }
    }

    // Calculate SLA deadline (72h for high, 120h for medium, 168h for low)
    const slaHours = severity === 'high' ? 72 : severity === 'medium' ? 120 : 168;
    const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString();

    const issue = await db.issues.insert({
      _id: uuidv4(),
      title: title || `${finalCategory.replace(/-/g, ' ')} issue report`,
      description,
      category: finalCategory,
      severity,
      priorityScore,
      status: 'submitted',
      images,
      location: {
        lat: parseFloat(latitude) || 0,
        lng: parseFloat(longitude) || 0,
        address: address || 'Location not specified'
      },
      reportedBy: req.user.id,
      reportedByName: req.user.name,
      assignedTo: null,
      assignedToName: null,
      department,
      upvotes: [],
      duplicateOf,
      aiAnalysis: {
        category: aiAnalysis.category,
        confidence: aiAnalysis.confidence,
        severity: aiAnalysis.severity,
        priorityScore
      },
      slaDeadline,
      resolvedAt: null,
      resolutionProof: [],
      feedback: null,
      rating: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Award points to user
    await db.users.update({ _id: req.user.id }, { $set: { points: (await db.users.findOne({ _id: req.user.id }))?.points + 10 || 10 } });

    // Notify admins
    const admins = await db.users.find({ role: 'admin' });
    for (const admin of admins) {
      await notifyUser(admin._id, 'new_issue', `New ${severity} priority ${finalCategory} issue reported`, issue._id);
    }

    emitRealtimeEvent('issues:changed', { issueId: issue._id, action: 'created' });
    res.status(201).json(issue);
  } catch (error) {
    console.error('Create issue error:', error);
    res.status(500).json({ error: 'Failed to create issue.' });
  }
};

export const getIssues = async (req, res) => {
  try {
    const { status, category, severity, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (category) query.category = category;
    if (severity) query.severity = severity;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
    const sortOrder = sort.startsWith('-') ? -1 : 1;

    const issues = await db.issues.find(query)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await db.issues.count(query);

    res.json({
      issues,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch issues.' });
  }
};

export const getMyIssues = async (req, res) => {
  try {
    const issues = await db.issues.find({ reportedBy: req.user.id }).sort({ createdAt: -1 });
    res.json(issues);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch your issues.' });
  }
};

export const getIssueById = async (req, res) => {
  try {
    const issue = await db.issues.findOne({ _id: req.params.id });
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found.' });
    }
    res.json(issue);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch issue.' });
  }
};

export const updateIssueStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['submitted', 'in-progress', 'resolved', 'escalated'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    const updateData = { 
      status, 
      updatedAt: new Date().toISOString() 
    };
    
    if (status === 'resolved') {
      updateData.resolvedAt = new Date().toISOString();
    }

    await db.issues.update({ _id: req.params.id }, { $set: updateData });
    const issue = await db.issues.findOne({ _id: req.params.id });

    // Notify the reporter
    if (issue) {
      await notifyUser(
        issue.reportedBy,
        'status_update',
        `Your issue "${issue.title}" status changed to ${status}`,
        issue._id
      );
    }

    if (issue) emitRealtimeEvent('issues:changed', { issueId: issue._id, action: 'status_updated', status });
    res.json(issue);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status.' });
  }
};

export const upvoteIssue = async (req, res) => {
  try {
    const issue = await db.issues.findOne({ _id: req.params.id });
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found.' });
    }

    const upvotes = issue.upvotes || [];
    const idx = upvotes.indexOf(req.user.id);
    
    if (idx > -1) {
      upvotes.splice(idx, 1);
    } else {
      upvotes.push(req.user.id);
    }

    await db.issues.update({ _id: req.params.id }, { $set: { upvotes, updatedAt: new Date().toISOString() } });
    
    emitRealtimeEvent('issues:changed', { issueId: req.params.id, action: 'upvoted' });
    res.json({ upvotes: upvotes.length, hasUpvoted: upvotes.includes(req.user.id) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle upvote.' });
  }
};

export const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Comment text is required.' });
    }

    const comment = await db.comments.insert({
      _id: uuidv4(),
      issueId: req.params.id,
      userId: req.user.id,
      userName: req.user.name,
      userAvatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(req.user.name)}`,
      text,
      createdAt: new Date().toISOString()
    });

    // Notify issue reporter
    const issue = await db.issues.findOne({ _id: req.params.id });
    if (issue && issue.reportedBy !== req.user.id) {
      await notifyUser(
        issue.reportedBy,
        'comment',
        `${req.user.name} commented on your issue "${issue.title}"`,
        issue._id
      );
    }

    emitRealtimeEvent('issues:changed', { issueId: req.params.id, action: 'comment_added' });
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment.' });
  }
};

export const getComments = async (req, res) => {
  try {
    const comments = await db.comments.find({ issueId: req.params.id }).sort({ createdAt: -1 });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch comments.' });
  }
};

export const addFeedback = async (req, res) => {
  try {
    const { rating, feedback } = req.body;
    await db.issues.update({ _id: req.params.id }, { 
      $set: { rating: parseInt(rating), feedback, updatedAt: new Date().toISOString() } 
    });
    
    const issue = await db.issues.findOne({ _id: req.params.id });
    if (issue) emitRealtimeEvent('issues:changed', { issueId: issue._id, action: 'feedback_added' });
    res.json(issue);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add feedback.' });
  }
};
