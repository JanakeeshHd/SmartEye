import db from '../config/database.js';
import { emitRealtimeEvent, notifyUser } from '../services/notificationService.js';

export const getWorkerTasks = async (req, res) => {
  try {
    const tasks = await db.issues.find({ assignedTo: req.user.id }).sort({ priorityScore: -1, createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
};

export const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['in-progress', 'resolved'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Workers can only set status to in-progress or resolved.' });
    }

    const updateData = { status, updatedAt: new Date().toISOString() };
    if (status === 'resolved') {
      updateData.resolvedAt = new Date().toISOString();
    }

    // Handle resolution proof images
    if (req.files && req.files.length > 0) {
      const proofImages = req.files.map(f => `/uploads/${f.filename}`);
      const issue = await db.issues.findOne({ _id: req.params.id });
      updateData.resolutionProof = [...(issue?.resolutionProof || []), ...proofImages];
    }

    await db.issues.update({ _id: req.params.id }, { $set: updateData });
    const issue = await db.issues.findOne({ _id: req.params.id });

    if (issue) {
      await notifyUser(
        issue.reportedBy,
        'status_update',
        `Your issue "${issue.title}" has been ${status === 'resolved' ? 'resolved' : 'updated to in-progress'}`,
        issue._id
      );
    }

    if (issue) emitRealtimeEvent('issues:changed', { issueId: issue._id, action: 'worker_status_updated', status: issue.status });
    res.json(issue);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task.' });
  }
};
