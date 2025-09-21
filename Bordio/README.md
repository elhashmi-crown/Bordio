# Bordio - Project Management App

A comprehensive project management application inspired by Bordio, built with Hono framework and Cloudflare Pages.

## 🌐 Live Application

- **Production URL**: https://3000-icyfbm4o9dxvjfb9a7faz-6532622b.e2b.dev
- **API Health Check**: https://3000-icyfbm4o9dxvjfb9a7faz-6532622b.e2b.dev/api/teams/1/dashboard

## 🎯 Project Overview

**Goal**: Create a Bordio-like project management platform with team collaboration, task scheduling, and comprehensive project management features.

**Key Features**:
- ✅ Team and project management
- ✅ Task scheduling with calendar interface 
- ✅ Waiting list (backlog) for future tasks
- ✅ Custom task statuses and workflows
- ✅ Event/meeting scheduling
- ✅ Dashboard with real-time statistics
- ✅ Time tracking capabilities
- ✅ Task comments and collaboration
- 🔄 File attachments and project notes
- 🔄 Reporting and analytics
- 🔄 Advanced filtering and export

## 🏗️ Data Architecture

### Database Models
- **Users**: Authentication and user management
- **Teams**: Organize users into collaborative groups
- **Projects**: Container for tasks within folders
- **Folders**: Organize projects hierarchically
- **Tasks**: Core work items with scheduling and status tracking
- **Events**: Meetings and calendar events
- **Task Statuses**: Custom workflow states (New, In Progress, Review, Testing, Done)
- **Time Entries**: Track time spent on tasks and events
- **Comments**: Task and event discussions
- **Attachments**: File uploads for tasks/events
- **Notes**: Project-specific documentation

### Storage Services
- **Cloudflare D1**: SQLite-based database for all relational data
- **Local Development**: Uses local SQLite with wrangler --local flag
- **Production**: Cloudflare D1 globally distributed database

## 📋 Currently Implemented Features

### ✅ Core Functionality
1. **Project & Team Management**
   - Create and organize projects into folders
   - Team member management with roles (owner, admin, member, guest)
   - Project collaboration and access control

2. **Task Management** 
   - Create tasks with title, description, priority, and assignments
   - Schedule tasks on specific dates or add to waiting list
   - Custom task statuses with workflow management
   - Task completion tracking with timestamps
   - Parent-child task relationships

3. **Calendar & Scheduling**
   - Daily schedule view with tasks and events
   - Navigate between dates with previous/next controls
   - Schedule tasks from waiting list to specific dates
   - Events/meetings with start/end times and locations

4. **Waiting List (Backlog)**
   - Dedicated space for unscheduled important tasks
   - Easy scheduling from waiting list to calendar
   - Priority-based task organization

5. **Dashboard Analytics**
   - Real-time statistics: Today's tasks, waiting list count, events, overdue items
   - Visual indicators for project progress
   - Quick action buttons for common operations

6. **Time Tracking**
   - Track time entries for tasks and events
   - Manual and automatic time logging
   - Duration calculations and reporting

7. **Collaboration Features**
   - Task comments system for team discussions
   - User assignments and notifications
   - Project member management

## 🚀 Functional API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User authentication

### Teams
- `GET /api/teams` - List all teams
- `POST /api/teams` - Create new team

### Projects  
- `GET /api/teams/:teamId/projects` - List team projects
- `POST /api/teams/:teamId/projects` - Create new project

### Tasks
- `GET /api/teams/:teamId/tasks` - Get tasks (supports date, project, status, assignee, waiting_list filters)
- `POST /api/teams/:teamId/tasks` - Create new task
- `PUT /api/tasks/:taskId` - Update task (status, completion, scheduling, etc.)

### Events
- `GET /api/teams/:teamId/events` - Get events (supports date range filters)
- `POST /api/teams/:teamId/events` - Create new event

### Time Tracking
- `POST /api/tasks/:taskId/time-entries` - Log time for task

### Comments
- `GET /api/tasks/:taskId/comments` - Get task comments
- `POST /api/tasks/:taskId/comments` - Add task comment

### Dashboard
- `GET /api/teams/:teamId/dashboard` - Get dashboard statistics

## 🎮 User Guide

### Getting Started
1. Access the application at the production URL
2. The app loads with sample data for "Acme Corp Development" team
3. View today's scheduled tasks and events on the main dashboard
4. Check the waiting list sidebar for unscheduled tasks

### Managing Tasks
1. **Create New Task**: Click "New Task" button or "Add Task" in Quick Actions
2. **Schedule Tasks**: Click on waiting list tasks to schedule them for specific dates
3. **Complete Tasks**: Click the circle icon next to tasks to mark as completed
4. **View Details**: Click the ellipsis (⋯) icon for task details

### Navigation
- **Dashboard**: Main view with today's schedule and statistics
- **Calendar Navigation**: Use left/right arrows to navigate between dates  
- **Current Date**: Displayed in the schedule header, updates as you navigate

### Quick Actions
- **Add Task**: Create new tasks quickly
- **Schedule Event**: Add meetings and events
- **New Project**: Create new projects for organizing work

### Project Organization
- Tasks are color-coded by project (blue, green, orange, purple)
- Projects can be organized into folders for better structure
- Team members can be assigned different roles and permissions

## 🛠️ Technology Stack

- **Backend**: Hono framework (TypeScript)
- **Frontend**: Vanilla JavaScript with Tailwind CSS
- **Database**: Cloudflare D1 (SQLite)
- **Deployment**: Cloudflare Pages
- **Development**: Wrangler CLI with local D1 database
- **Process Management**: PM2 for local development
- **Icons**: Font Awesome
- **HTTP Client**: Axios

## 📈 Deployment Status

- **Platform**: Cloudflare Pages (Ready for deployment)
- **Status**: ✅ Active (Local development environment)
- **Database**: ✅ Configured (Local SQLite with sample data)
- **API Endpoints**: ✅ Fully functional
- **Frontend**: ✅ Interactive dashboard with real-time data
- **Last Updated**: September 21, 2025

## 🔮 Recommended Next Steps

### Priority Features to Implement

1. **Enhanced UI Components** (High Priority)
   - Modal dialogs for creating/editing tasks and events
   - Better form validation and user feedback
   - Improved mobile responsiveness

2. **Advanced Task Features** (High Priority)
   - Recurring tasks and events
   - Task dependencies and subtasks
   - Advanced filtering (by status, assignee, project, priority)
   - Bulk task operations

3. **Calendar Views** (Medium Priority)
   - Weekly and monthly calendar views
   - Drag-and-drop task scheduling
   - Calendar integration (Google Calendar sync)

4. **Reporting & Analytics** (Medium Priority)
   - Team performance reports
   - Time tracking analytics  
   - Project progress dashboards
   - Export functionality (CSV, Excel)

5. **Collaboration Features** (Medium Priority)
   - Real-time notifications
   - File upload and attachment system
   - @mentions in comments
   - Project notes and documentation

6. **User Experience** (Low Priority)
   - Dark mode support
   - Customizable workflows
   - Personal preferences and settings
   - Mobile app (PWA)

### Technical Improvements

1. **Authentication & Security**
   - Implement proper JWT authentication
   - Password reset functionality
   - Role-based access control
   - API rate limiting

2. **Performance Optimization**
   - Implement caching strategies
   - Optimize database queries
   - Add pagination for large datasets
   - Implement real-time updates with WebSockets

3. **Production Deployment**
   - Set up Cloudflare API key for production deployment
   - Configure environment variables and secrets
   - Set up CI/CD pipeline
   - Add error monitoring and logging

## 🗃️ Sample Data

The application includes comprehensive sample data:
- **5 Users**: Admin, team members, and guest user
- **1 Team**: "Acme Corp Development" with all users
- **3 Projects**: E-commerce Website, Mobile App, Marketing Campaign
- **10 Tasks**: Mix of scheduled and waiting list tasks
- **4 Events**: Daily standups, sprint planning, client meetings
- **Default Statuses**: New, In Progress, Review, Testing, Done
- **Time Entries**: Sample time tracking data
- **Comments**: Task collaboration examples

## 🔧 Development Commands

```bash
# Database operations
npm run db:migrate:local    # Apply migrations locally
npm run db:seed            # Seed with sample data
npm run db:reset           # Reset local database
npm run db:console:local   # Open database console

# Development server
npm run build              # Build application
npm run dev:d1            # Start with D1 database
npm run clean-port        # Clean port 3000
npm run test              # Test local server

# Production deployment (requires Cloudflare API key)
npm run deploy            # Deploy to Cloudflare Pages
npm run deploy:prod       # Deploy to production project
```

## 🎯 Feature Completion Status

- ✅ **Core MVP**: Team/project management, task scheduling, waiting list
- ✅ **Dashboard**: Real-time statistics and today's schedule
- ✅ **API Layer**: Comprehensive REST API with all major endpoints
- ✅ **Database**: Full schema with relationships and sample data
- 🔄 **Advanced Features**: File uploads, advanced reporting, calendar views
- ⏳ **Production**: Ready for Cloudflare deployment with API key setup

This Bordio-inspired project management app provides a solid foundation for team collaboration and task management, with room for extensive feature expansion based on user needs.