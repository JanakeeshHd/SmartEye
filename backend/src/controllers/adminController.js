import db from '../config/database.js';
import { emitRealtimeEvent, notifyUser } from '../services/notificationService.js';

export const getAnalytics = async (req, res) => {
  try {
    const allIssues = await db.issues.find({});
    
    // Status distribution
    const statusCounts = { submitted: 0, 'in-progress': 0, resolved: 0, escalated: 0 };
    const categoryCounts = {};
    const severityCounts = { low: 0, medium: 0, high: 0 };
    const departmentCounts = {};
    const dailyCounts = {};
    const areaCounts = {};
    let totalResolutionTime = 0;
    let resolvedCount = 0;

    allIssues.forEach(issue => {
      // Status
      statusCounts[issue.status] = (statusCounts[issue.status] || 0) + 1;
      
      // Category
      categoryCounts[issue.category] = (categoryCounts[issue.category] || 0) + 1;
      
      // Severity
      severityCounts[issue.severity] = (severityCounts[issue.severity] || 0) + 1;
      
      // Department
      if (issue.department) {
        departmentCounts[issue.department] = departmentCounts[issue.department] || { total: 0, resolved: 0 };
        departmentCounts[issue.department].total++;
        if (issue.status === 'resolved') departmentCounts[issue.department].resolved++;
      }

      // Daily trend (last 30 days)
      const day = (issue.createdAt || '').slice(0, 10);
      if (day) dailyCounts[day] = (dailyCounts[day] || 0) + 1;

      // Area (by address)
      const area = issue.location?.address?.split(',')[0] || 'Unknown';
      areaCounts[area] = (areaCounts[area] || 0) + 1;

      // Resolution time
      if (issue.resolvedAt && issue.createdAt) {
        const diff = new Date(issue.resolvedAt) - new Date(issue.createdAt);
        totalResolutionTime += diff;
        resolvedCount++;
      }
    });

    // SLA compliance
    const now = new Date();
    const overdue = allIssues.filter(i => 
      i.status !== 'resolved' && i.slaDeadline && new Date(i.slaDeadline) < now
    ).length;

    // Weekly trends (last 7 days)
    const weeklyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      weeklyTrend.push({ date: key, count: dailyCounts[key] || 0 });
    }

    // Department performance
    const departmentPerformance = Object.entries(departmentCounts).map(([name, data]) => ({
      name,
      total: data.total,
      resolved: data.resolved,
      rate: data.total > 0 ? Math.round((data.resolved / data.total) * 100) : 0
    }));

    // Top areas
    const topAreas = Object.entries(areaCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([area, count]) => ({ area, count }));

    res.json({
      overview: {
        total: allIssues.length,
        submitted: statusCounts.submitted,
        inProgress: statusCounts['in-progress'],
        resolved: statusCounts.resolved,
        escalated: statusCounts.escalated,
        overdue,
        avgResolutionTime: resolvedCount > 0 ? Math.round(totalResolutionTime / resolvedCount / (1000 * 60 * 60)) : 0
      },
      statusCounts,
      categoryCounts,
      severityCounts,
      weeklyTrend,
      departmentPerformance,
      topAreas
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to generate analytics.' });
  }
};

export const getAllIssuesAdmin = async (req, res) => {
  try {
    const { status, category, severity, department, page = 1, limit = 50 } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (category) query.category = category;
    if (severity) query.severity = severity;
    if (department) query.department = department;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const issues = await db.issues.find(query).sort({ priorityScore: -1, createdAt: -1 }).skip(skip).limit(parseInt(limit));
    const total = await db.issues.count(query);

    res.json({
      issues,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch issues.' });
  }
};

export const assignIssue = async (req, res) => {
  try {
    const { workerId, workerName } = req.body;
    
    await db.issues.update({ _id: req.params.id }, { 
      $set: { 
        assignedTo: workerId, 
        assignedToName: workerName || 'Worker',
        status: 'in-progress', 
        updatedAt: new Date().toISOString() 
      } 
    });
    
    const issue = await db.issues.findOne({ _id: req.params.id });

    // Notify worker
    await notifyUser(workerId, 'assignment', `New task assigned: "${issue.title}"`, issue._id);
    
    // Notify reporter
    await notifyUser(issue.reportedBy, 'status_update', `Your issue "${issue.title}" has been assigned to a worker`, issue._id);

    emitRealtimeEvent('issues:changed', { issueId: issue._id, action: 'assigned', status: issue.status });
    res.json(issue);
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign issue.' });
  }
};

export const escalateIssue = async (req, res) => {
  try {
    await db.issues.update({ _id: req.params.id }, {
      $set: { status: 'escalated', updatedAt: new Date().toISOString() }
    });
    const issue = await db.issues.findOne({ _id: req.params.id });
    
    if (issue) {
      await notifyUser(issue.reportedBy, 'escalation', `Your issue "${issue.title}" has been escalated for faster resolution`, issue._id);
    }

    if (issue) emitRealtimeEvent('issues:changed', { issueId: issue._id, action: 'escalated', status: issue.status });
    res.json(issue);
  } catch (error) {
    res.status(500).json({ error: 'Failed to escalate issue.' });
  }
};

export const generateReport = async (req, res) => {
  try {
    const { period = 'weekly' } = req.query;
    const daysBack = period === 'monthly' ? 30 : 7;
    const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
    
    const allIssues = await db.issues.find({});
    const periodIssues = allIssues.filter(i => i.createdAt >= cutoff);

    const report = {
      period,
      dateRange: { from: cutoff, to: new Date().toISOString() },
      summary: {
        totalNew: periodIssues.length,
        resolved: periodIssues.filter(i => i.status === 'resolved').length,
        pending: periodIssues.filter(i => i.status !== 'resolved').length,
        highPriority: periodIssues.filter(i => i.severity === 'high').length
      },
      categoryBreakdown: {},
      topAreas: []
    };

    periodIssues.forEach(i => {
      report.categoryBreakdown[i.category] = (report.categoryBreakdown[i.category] || 0) + 1;
    });

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report.' });
  }
};
