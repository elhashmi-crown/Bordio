import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

// Type definitions for Cloudflare bindings
type Bindings = {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for frontend-backend communication
app.use('/api/*', cors({
  origin: ['http://localhost:3000', 'https://*.pages.dev'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}))

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// Database initialization
async function initializeDatabase(db: D1Database) {
  // Create default task statuses if they don't exist
  const statusesCheck = await db.prepare("SELECT COUNT(*) as count FROM task_statuses WHERE team_id IS NULL").first();
  
  if (statusesCheck?.count === 0) {
    const defaultStatuses = [
      { name: 'New', color: '#6b7280', sort_order: 1, is_completed: false },
      { name: 'In Progress', color: '#3b82f6', sort_order: 2, is_completed: false },
      { name: 'Review', color: '#f59e0b', sort_order: 3, is_completed: false },
      { name: 'Testing', color: '#8b5cf6', sort_order: 4, is_completed: false },
      { name: 'Done', color: '#10b981', sort_order: 5, is_completed: true }
    ];
    
    for (const status of defaultStatuses) {
      await db.prepare(`
        INSERT INTO task_statuses (name, color, sort_order, is_completed, is_default)
        VALUES (?, ?, ?, ?, true)
      `).bind(status.name, status.color, status.sort_order, status.is_completed).run();
    }
  }
}

// API Routes

// Authentication endpoints
app.post('/api/auth/register', async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    // Simple password hash (in production, use proper bcrypt)
    const passwordHash = `$2b$10$${Buffer.from(password).toString('base64')}`;
    
    const result = await c.env.DB.prepare(`
      INSERT INTO users (email, password_hash, name)
      VALUES (?, ?, ?)
    `).bind(email, passwordHash, name).run();
    
    return c.json({ 
      success: true, 
      user: { id: result.meta.last_row_id, email, name }
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.post('/api/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    const user = await c.env.DB.prepare(`
      SELECT id, email, name, role FROM users WHERE email = ? AND is_active = true
    `).bind(email).first();
    
    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
    
    // Simple session (in production, use proper JWT or sessions)
    const sessionId = `session_${user.id}_${Date.now()}`;
    
    return c.json({ 
      success: true, 
      user,
      sessionId
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// Teams endpoints
app.get('/api/teams', async (c) => {
  try {
    const teams = await c.env.DB.prepare(`
      SELECT t.*, u.name as owner_name,
             COUNT(tm.user_id) as member_count
      FROM teams t
      LEFT JOIN users u ON t.owner_id = u.id
      LEFT JOIN team_members tm ON t.id = tm.team_id
      WHERE t.is_active = true
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `).all();
    
    return c.json(teams.results);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/api/teams', async (c) => {
  try {
    const { name, description, ownerId } = await c.req.json();
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    const result = await c.env.DB.prepare(`
      INSERT INTO teams (name, description, owner_id, slug)
      VALUES (?, ?, ?, ?)
    `).bind(name, description, ownerId, slug).run();
    
    // Add owner as team member
    await c.env.DB.prepare(`
      INSERT INTO team_members (team_id, user_id, role)
      VALUES (?, ?, 'owner')
    `).bind(result.meta.last_row_id, ownerId).run();
    
    return c.json({ 
      success: true, 
      team: { id: result.meta.last_row_id, name, description, slug }
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// Projects endpoints
app.get('/api/teams/:teamId/projects', async (c) => {
  try {
    const teamId = c.req.param('teamId');
    
    const projects = await c.env.DB.prepare(`
      SELECT p.*, f.name as folder_name, u.name as owner_name,
             COUNT(pm.user_id) as member_count
      FROM projects p
      LEFT JOIN folders f ON p.folder_id = f.id
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE p.team_id = ? AND p.status = 'active'
      GROUP BY p.id
      ORDER BY p.sort_order, p.created_at DESC
    `).bind(teamId).all();
    
    return c.json(projects.results);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/api/teams/:teamId/projects', async (c) => {
  try {
    const teamId = c.req.param('teamId');
    const { name, description, folderId, ownerId, color } = await c.req.json();
    
    const result = await c.env.DB.prepare(`
      INSERT INTO projects (name, description, team_id, folder_id, owner_id, color)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(name, description, teamId, folderId, ownerId, color || '#3b82f6').run();
    
    // Add owner as project member
    await c.env.DB.prepare(`
      INSERT INTO project_members (project_id, user_id, role)
      VALUES (?, ?, 'owner')
    `).bind(result.meta.last_row_id, ownerId).run();
    
    return c.json({ 
      success: true, 
      project: { id: result.meta.last_row_id, name, description, color }
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// Tasks endpoints
app.get('/api/teams/:teamId/tasks', async (c) => {
  try {
    const teamId = c.req.param('teamId');
    const { date, project, status, assignee, waiting_list } = c.req.query();
    
    let query = `
      SELECT t.*, p.name as project_name, p.color as project_color,
             u1.name as assignee_name, u2.name as creator_name,
             ts.name as status_name, ts.color as status_color, ts.is_completed
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u1 ON t.assignee_id = u1.id
      LEFT JOIN users u2 ON t.creator_id = u2.id
      LEFT JOIN task_statuses ts ON t.status_id = ts.id
      WHERE t.team_id = ?
    `;
    
    const params: any[] = [teamId];
    
    if (waiting_list === 'true') {
      query += ` AND t.is_waiting_list = true`;
    } else if (date) {
      query += ` AND t.scheduled_date = ?`;
      params.push(date);
    }
    
    if (project) {
      query += ` AND t.project_id = ?`;
      params.push(project);
    }
    
    if (status) {
      query += ` AND t.status_id = ?`;
      params.push(status);
    }
    
    if (assignee) {
      query += ` AND t.assignee_id = ?`;
      params.push(assignee);
    }
    
    query += ` ORDER BY t.sort_order, t.created_at DESC`;
    
    const stmt = c.env.DB.prepare(query);
    const tasks = await stmt.bind(...params).all();
    
    return c.json(tasks.results);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/api/teams/:teamId/tasks', async (c) => {
  try {
    const teamId = c.req.param('teamId');
    const { 
      title, description, projectId, assigneeId, creatorId, statusId,
      priority, scheduledDate, dueDate, estimatedHours, isWaitingList 
    } = await c.req.json();
    
    const result = await c.env.DB.prepare(`
      INSERT INTO tasks (
        title, description, project_id, team_id, assignee_id, creator_id,
        status_id, priority, scheduled_date, due_date, estimated_hours, is_waiting_list
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      title, description, projectId, teamId, assigneeId, creatorId,
      statusId, priority || 'medium', scheduledDate, dueDate, estimatedHours, isWaitingList || false
    ).run();
    
    return c.json({ 
      success: true, 
      task: { id: result.meta.last_row_id, title, description }
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.put('/api/tasks/:taskId', async (c) => {
  try {
    const taskId = c.req.param('taskId');
    const updates = await c.req.json();
    
    // Build dynamic update query
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    
    await c.env.DB.prepare(`
      UPDATE tasks SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(...values, taskId).run();
    
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// Events endpoints
app.get('/api/teams/:teamId/events', async (c) => {
  try {
    const teamId = c.req.param('teamId');
    const { start_date, end_date } = c.req.query();
    
    let query = `
      SELECT e.*, u.name as creator_name, p.name as project_name
      FROM events e
      LEFT JOIN users u ON e.creator_id = u.id
      LEFT JOIN projects p ON e.project_id = p.id
      WHERE e.team_id = ?
    `;
    
    const params: any[] = [teamId];
    
    if (start_date && end_date) {
      query += ` AND DATE(e.start_datetime) BETWEEN ? AND ?`;
      params.push(start_date, end_date);
    }
    
    query += ` ORDER BY e.start_datetime ASC`;
    
    const events = await c.env.DB.prepare(query).bind(...params).all();
    
    return c.json(events.results);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/api/teams/:teamId/events', async (c) => {
  try {
    const teamId = c.req.param('teamId');
    const { 
      title, description, projectId, creatorId, startDatetime, endDatetime,
      location, isAllDay, reminderMinutes 
    } = await c.req.json();
    
    const result = await c.env.DB.prepare(`
      INSERT INTO events (
        title, description, project_id, team_id, creator_id,
        start_datetime, end_datetime, location, is_all_day, reminder_minutes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      title, description, projectId, teamId, creatorId,
      startDatetime, endDatetime, location, isAllDay || false, reminderMinutes || 15
    ).run();
    
    return c.json({ 
      success: true, 
      event: { id: result.meta.last_row_id, title, description }
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// Time tracking endpoints
app.post('/api/tasks/:taskId/time-entries', async (c) => {
  try {
    const taskId = c.req.param('taskId');
    const { userId, description, startTime, endTime, durationMinutes } = await c.req.json();
    
    const result = await c.env.DB.prepare(`
      INSERT INTO time_entries (task_id, user_id, description, start_time, end_time, duration_minutes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(taskId, userId, description, startTime, endTime, durationMinutes).run();
    
    return c.json({ 
      success: true, 
      entry: { id: result.meta.last_row_id }
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// Comments endpoints
app.get('/api/tasks/:taskId/comments', async (c) => {
  try {
    const taskId = c.req.param('taskId');
    
    const comments = await c.env.DB.prepare(`
      SELECT c.*, u.name as user_name
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.task_id = ?
      ORDER BY c.created_at ASC
    `).bind(taskId).all();
    
    return c.json(comments.results);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/api/tasks/:taskId/comments', async (c) => {
  try {
    const taskId = c.req.param('taskId');
    const { userId, content } = await c.req.json();
    
    const result = await c.env.DB.prepare(`
      INSERT INTO comments (task_id, user_id, content)
      VALUES (?, ?, ?)
    `).bind(taskId, userId, content).run();
    
    return c.json({ 
      success: true, 
      comment: { id: result.meta.last_row_id, content }
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// Dashboard data endpoint
app.get('/api/teams/:teamId/dashboard', async (c) => {
  try {
    const teamId = c.req.param('teamId');
    const today = new Date().toISOString().split('T')[0];
    
    // Today's tasks
    const todayTasks = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM tasks 
      WHERE team_id = ? AND scheduled_date = ? AND is_completed = false
    `).bind(teamId, today).first();
    
    // Waiting list tasks
    const waitingTasks = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM tasks 
      WHERE team_id = ? AND is_waiting_list = true
    `).bind(teamId).first();
    
    // Today's events
    const todayEvents = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM events 
      WHERE team_id = ? AND DATE(start_datetime) = ?
    `).bind(teamId, today).first();
    
    // Overdue tasks
    const overdueTasks = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM tasks 
      WHERE team_id = ? AND due_date < ? AND is_completed = false
    `).bind(teamId, today).first();
    
    return c.json({
      todayTasks: todayTasks?.count || 0,
      waitingTasks: waitingTasks?.count || 0,
      todayEvents: todayEvents?.count || 0,
      overdueTasks: overdueTasks?.count || 0
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Initialize database on first request
app.use('*', async (c, next) => {
  if (c.env.DB) {
    await initializeDatabase(c.env.DB);
  }
  return next();
});

// Main page route
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bordio - Project Management</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  'bordio-blue': '#3b82f6',
                  'bordio-green': '#10b981',
                  'bordio-orange': '#f59e0b',
                  'bordio-purple': '#8b5cf6'
                }
              }
            }
          }
        </script>
        <link href="/static/style.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50 min-h-screen">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between h-16">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 flex items-center">
                            <i class="fas fa-calendar-alt text-bordio-blue text-2xl mr-3"></i>
                            <h1 class="text-xl font-bold text-gray-900">Bordio</h1>
                        </div>
                        <nav class="hidden md:ml-8 md:flex md:space-x-8">
                            <a href="#" class="text-bordio-blue border-b-2 border-bordio-blue px-1 pt-1 pb-4 text-sm font-medium">Dashboard</a>
                            <a href="#" class="text-gray-500 hover:text-gray-700 px-1 pt-1 pb-4 text-sm font-medium">Calendar</a>
                            <a href="#" class="text-gray-500 hover:text-gray-700 px-1 pt-1 pb-4 text-sm font-medium">Projects</a>
                            <a href="#" class="text-gray-500 hover:text-gray-700 px-1 pt-1 pb-4 text-sm font-medium">Team</a>
                            <a href="#" class="text-gray-500 hover:text-gray-700 px-1 pt-1 pb-4 text-sm font-medium">Reports</a>
                        </nav>
                    </div>
                    <div class="flex items-center space-x-4">
                        <button class="bg-bordio-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                            <i class="fas fa-plus mr-2"></i>New Task
                        </button>
                        <div class="relative">
                            <button class="flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bordio-blue">
                                <img class="h-8 w-8 rounded-full" src="https://ui-avatars.com/api/?name=User&background=3b82f6&color=fff" alt="Profile">
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Main Content -->
        <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <!-- Dashboard Stats -->
            <div class="mb-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-4">Dashboard</h2>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6" id="dashboard-stats">
                    <div class="bg-white overflow-hidden shadow rounded-lg">
                        <div class="p-5">
                            <div class="flex items-center">
                                <div class="flex-shrink-0">
                                    <i class="fas fa-tasks text-bordio-blue text-2xl"></i>
                                </div>
                                <div class="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt class="text-sm font-medium text-gray-500 truncate">Today's Tasks</dt>
                                        <dd class="text-lg font-medium text-gray-900" id="today-tasks">0</dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white overflow-hidden shadow rounded-lg">
                        <div class="p-5">
                            <div class="flex items-center">
                                <div class="flex-shrink-0">
                                    <i class="fas fa-clock text-bordio-orange text-2xl"></i>
                                </div>
                                <div class="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt class="text-sm font-medium text-gray-500 truncate">Waiting List</dt>
                                        <dd class="text-lg font-medium text-gray-900" id="waiting-tasks">0</dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white overflow-hidden shadow rounded-lg">
                        <div class="p-5">
                            <div class="flex items-center">
                                <div class="flex-shrink-0">
                                    <i class="fas fa-calendar text-bordio-green text-2xl"></i>
                                </div>
                                <div class="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt class="text-sm font-medium text-gray-500 truncate">Today's Events</dt>
                                        <dd class="text-lg font-medium text-gray-900" id="today-events">0</dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white overflow-hidden shadow rounded-lg">
                        <div class="p-5">
                            <div class="flex items-center">
                                <div class="flex-shrink-0">
                                    <i class="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
                                </div>
                                <div class="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt class="text-sm font-medium text-gray-500 truncate">Overdue</dt>
                                        <dd class="text-lg font-medium text-gray-900" id="overdue-tasks">0</dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Layout -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Today's Schedule -->
                <div class="lg:col-span-2">
                    <div class="bg-white shadow rounded-lg">
                        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 class="text-lg font-medium text-gray-900">Today's Schedule</h3>
                            <div class="flex space-x-2">
                                <button class="text-gray-400 hover:text-gray-600">
                                    <i class="fas fa-chevron-left"></i>
                                </button>
                                <span class="text-sm text-gray-600 px-2" id="current-date">Today</span>
                                <button class="text-gray-400 hover:text-gray-600">
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>
                        <div class="p-6">
                            <div id="today-schedule" class="space-y-4">
                                <!-- Tasks and events will be loaded here -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Sidebar -->
                <div class="space-y-6">
                    <!-- Waiting List -->
                    <div class="bg-white shadow rounded-lg">
                        <div class="px-6 py-4 border-b border-gray-200">
                            <h3 class="text-lg font-medium text-gray-900">Waiting List</h3>
                        </div>
                        <div class="p-6">
                            <div id="waiting-list" class="space-y-3">
                                <!-- Waiting list tasks will be loaded here -->
                            </div>
                        </div>
                    </div>

                    <!-- Quick Actions -->
                    <div class="bg-white shadow rounded-lg">
                        <div class="px-6 py-4 border-b border-gray-200">
                            <h3 class="text-lg font-medium text-gray-900">Quick Actions</h3>
                        </div>
                        <div class="p-6 space-y-3">
                            <button class="w-full text-left px-4 py-2 text-sm text-bordio-blue hover:bg-blue-50 rounded-lg transition-colors">
                                <i class="fas fa-plus mr-2"></i>Add Task
                            </button>
                            <button class="w-full text-left px-4 py-2 text-sm text-bordio-green hover:bg-green-50 rounded-lg transition-colors">
                                <i class="fas fa-calendar-plus mr-2"></i>Schedule Event
                            </button>
                            <button class="w-full text-left px-4 py-2 text-sm text-bordio-purple hover:bg-purple-50 rounded-lg transition-colors">
                                <i class="fas fa-folder-plus mr-2"></i>New Project
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app