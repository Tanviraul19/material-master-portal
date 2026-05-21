const db = require('../config/db');

exports.getStats = async (req, res) => {
  try {
    const total = await db.query('SELECT COUNT(*) as count FROM material_requests');
    const pending = await db.query("SELECT COUNT(*) as count FROM material_requests WHERE status LIKE 'Pending%'");
    const approved = await db.query("SELECT COUNT(*) as count FROM material_requests WHERE status = 'Approved'");
    const rejected = await db.query("SELECT COUNT(*) as count FROM material_requests WHERE status = 'Rejected'");

    // Timeline data (last 7 days)
    const timeline = await db.query(`
      SELECT 
        DATE(created_at) as date, 
        COUNT(*) as count 
      FROM material_requests 
      WHERE created_at >= date('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Recent Activity
    const activity = await db.query(`
      SELECT 
        l.action, 
        l.comments, 
        l.created_at, 
        u.full_name as user, 
        r.req_number 
      FROM approval_logs l
      JOIN users u ON l.approver_id = u.id
      JOIN material_requests r ON l.request_id = r.id
      ORDER BY l.created_at DESC
      LIMIT 10
    `);

    res.status(200).json({
      total: total[0]?.count || 0,
      pending: pending[0]?.count || 0,
      approved: approved[0]?.count || 0,
      rejected: rejected[0]?.count || 0,
      timeline,
      activity
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
