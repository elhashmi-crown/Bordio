-- Sample data for Bordio-like project management app

-- Insert sample users
INSERT OR IGNORE INTO users (id, email, password_hash, name, role) VALUES 
  (1, 'admin@bordio.com', '$2b$10$dummy_hash_admin', 'John Admin', 'admin'),
  (2, 'alice@company.com', '$2b$10$dummy_hash_alice', 'Alice Johnson', 'user'),
  (3, 'bob@company.com', '$2b$10$dummy_hash_bob', 'Bob Smith', 'user'),
  (4, 'charlie@company.com', '$2b$10$dummy_hash_charlie', 'Charlie Brown', 'user'),
  (5, 'guest@external.com', '$2b$10$dummy_hash_guest', 'External Guest', 'guest');

-- Insert sample team
INSERT OR IGNORE INTO teams (id, name, description, owner_id, slug) VALUES 
  (1, 'Acme Corp Development', 'Main development team for Acme Corporation', 1, 'acme-dev');

-- Add team members
INSERT OR IGNORE INTO team_members (team_id, user_id, role) VALUES 
  (1, 1, 'owner'),
  (1, 2, 'admin'),
  (1, 3, 'member'),
  (1, 4, 'member'),
  (1, 5, 'guest');

-- Insert sample folder
INSERT OR IGNORE INTO folders (id, name, description, team_id, color) VALUES 
  (1, 'Web Projects', 'All web development projects', 1, '#3b82f6'),
  (2, 'Mobile Projects', 'Mobile app development projects', 1, '#10b981');

-- Insert sample projects
INSERT OR IGNORE INTO projects (id, name, description, team_id, folder_id, owner_id, color) VALUES 
  (1, 'E-commerce Website', 'New company e-commerce platform', 1, 1, 2, '#3b82f6'),
  (2, 'Mobile App', 'Customer mobile application', 1, 2, 3, '#10b981'),
  (3, 'Marketing Campaign', 'Q4 marketing campaign planning', 1, NULL, 2, '#f59e0b');

-- Add project members
INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES 
  (1, 2, 'owner'),
  (1, 3, 'member'),
  (1, 4, 'member'),
  (2, 3, 'owner'),
  (2, 4, 'member'),
  (3, 2, 'owner'),
  (3, 5, 'viewer');

-- Insert default task statuses
INSERT OR IGNORE INTO task_statuses (id, name, color, team_id, is_default, is_completed, sort_order) VALUES 
  (1, 'New', '#6b7280', 1, TRUE, FALSE, 1),
  (2, 'In Progress', '#3b82f6', 1, TRUE, FALSE, 2),
  (3, 'Review', '#f59e0b', 1, TRUE, FALSE, 3),
  (4, 'Testing', '#8b5cf6', 1, TRUE, FALSE, 4),
  (5, 'Done', '#10b981', 1, TRUE, TRUE, 5);

-- Insert sample tasks for today and this week
INSERT OR IGNORE INTO tasks (id, title, description, project_id, team_id, assignee_id, creator_id, status_id, priority, scheduled_date, due_date, estimated_hours) VALUES 
  -- Today's tasks
  (1, 'Design homepage mockup', 'Create wireframes and mockups for the new homepage', 1, 1, 2, 1, 1, 'high', DATE('now'), DATE('now', '+2 days'), 4.0),
  (2, 'Set up database schema', 'Create initial database tables and relationships', 1, 1, 3, 1, 2, 'medium', DATE('now'), DATE('now', '+1 day'), 3.0),
  (3, 'Team standup meeting', 'Daily standup to sync on progress', NULL, 1, NULL, 1, 5, 'medium', DATE('now'), DATE('now'), 0.5),
  
  -- Tomorrow's tasks
  (4, 'Implement user authentication', 'Build login and registration system', 1, 1, 3, 1, 1, 'high', DATE('now', '+1 day'), DATE('now', '+3 days'), 6.0),
  (5, 'Mobile app wireframes', 'Create initial wireframes for mobile app', 2, 1, 4, 1, 1, 'medium', DATE('now', '+1 day'), DATE('now', '+4 days'), 5.0),
  
  -- This week's tasks
  (6, 'API documentation', 'Document all API endpoints', 1, 1, 2, 1, 1, 'low', DATE('now', '+3 days'), DATE('now', '+7 days'), 2.0),
  (7, 'User testing session', 'Conduct user testing for new features', 2, 1, 4, 1, 1, 'medium', DATE('now', '+4 days'), DATE('now', '+6 days'), 4.0),
  
  -- Waiting list tasks (no scheduled date)
  (8, 'Performance optimization', 'Optimize app performance and loading times', 1, 1, NULL, 1, 1, 'medium', NULL, NULL, 8.0),
  (9, 'Security audit', 'Conduct comprehensive security review', 1, 1, NULL, 1, 1, 'high', NULL, NULL, 12.0),
  (10, 'Analytics implementation', 'Integrate analytics tracking', 2, 1, NULL, 1, 1, 'low', NULL, NULL, 3.0);

-- Mark waiting list tasks
UPDATE tasks SET is_waiting_list = TRUE WHERE scheduled_date IS NULL;

-- Insert sample events/meetings
INSERT OR IGNORE INTO events (id, title, description, team_id, creator_id, start_datetime, end_datetime, reminder_minutes) VALUES 
  (1, 'Daily Standup', 'Team daily sync meeting', 1, 1, DATETIME('now', '+9 hours'), DATETIME('now', '+9 hours', '+30 minutes'), 5),
  (2, 'Sprint Planning', 'Plan tasks for next sprint', 1, 1, DATETIME('now', '+1 day', '+14 hours'), DATETIME('now', '+1 day', '+16 hours'), 15),
  (3, 'Client Presentation', 'Present progress to client', 1, 2, DATETIME('now', '+3 days', '+15 hours'), DATETIME('now', '+3 days', '+16 hours'), 30),
  (4, 'Team Retrospective', 'Weekly team retrospective meeting', 1, 1, DATETIME('now', '+7 days', '+14 hours'), DATETIME('now', '+7 days', '+15 hours'), 15);

-- Add event attendees
INSERT OR IGNORE INTO event_attendees (event_id, user_id, status, is_organizer) VALUES 
  (1, 1, 'accepted', TRUE),
  (1, 2, 'accepted', FALSE),
  (1, 3, 'accepted', FALSE),
  (1, 4, 'accepted', FALSE),
  (2, 1, 'accepted', TRUE),
  (2, 2, 'accepted', FALSE),
  (2, 3, 'pending', FALSE),
  (3, 2, 'accepted', TRUE),
  (3, 5, 'pending', FALSE),
  (4, 1, 'accepted', TRUE),
  (4, 2, 'accepted', FALSE),
  (4, 3, 'accepted', FALSE),
  (4, 4, 'accepted', FALSE);

-- Insert sample time entries
INSERT OR IGNORE INTO time_entries (task_id, user_id, description, start_time, end_time, duration_minutes) VALUES 
  (1, 2, 'Working on homepage mockup', DATETIME('now', '-2 hours'), DATETIME('now', '-1 hour'), 60),
  (2, 3, 'Setting up database tables', DATETIME('now', '-3 hours'), DATETIME('now', '-1 hour'), 120),
  (4, 3, 'Research authentication libraries', DATETIME('now', '-1 day'), DATETIME('now', '-1 day', '+90 minutes'), 90);

-- Insert sample comments
INSERT OR IGNORE INTO comments (task_id, user_id, content) VALUES 
  (1, 2, 'Started working on the mockups. Will have initial designs ready by EOD.'),
  (1, 1, 'Great! Make sure to consider mobile responsiveness in the design.'),
  (2, 3, 'Database schema is looking good. Should we add indexing for better performance?'),
  (4, 1, 'Priority task - please focus on this after completing the current sprint items.');

-- Insert sample notes
INSERT OR IGNORE INTO notes (title, content, project_id, creator_id) VALUES 
  ('Project Requirements', '## E-commerce Platform Requirements\n\n- User authentication system\n- Product catalog with search\n- Shopping cart functionality\n- Payment integration\n- Order management\n- Admin dashboard', 1, 2),
  ('API Endpoints', '## Available API Endpoints\n\n### Authentication\n- POST /api/auth/login\n- POST /api/auth/register\n- POST /api/auth/logout\n\n### Users\n- GET /api/users/profile\n- PUT /api/users/profile', 1, 3),
  ('Meeting Notes', '## Sprint Planning Notes\n\n### Completed Last Sprint\n- Homepage design ✓\n- User registration ✓\n- Basic navigation ✓\n\n### Next Sprint Goals\n- Authentication system\n- Product catalog\n- Search functionality', 3, 2);

-- Insert sample notifications
INSERT OR IGNORE INTO notifications (user_id, title, message, type, entity_type, entity_id) VALUES 
  (2, 'New Task Assigned', 'You have been assigned to "Design homepage mockup"', 'task_assigned', 'task', 1),
  (3, 'Task Due Soon', 'Task "Set up database schema" is due tomorrow', 'task_due', 'task', 2),
  (4, 'Meeting Reminder', 'Sprint Planning meeting in 30 minutes', 'event_reminder', 'event', 2),
  (5, 'Project Invitation', 'You have been invited to join "Marketing Campaign" project', 'project_invite', 'project', 3);