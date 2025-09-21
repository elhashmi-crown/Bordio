// Bordio Project Management Frontend

class BordioApp {
    constructor() {
        this.currentTeamId = 1; // Default team for demo
        this.currentUserId = 1; // Default user for demo
        this.currentDate = new Date();
        
        this.init();
    }

    async init() {
        await this.loadDashboardStats();
        await this.loadTodaySchedule();
        await this.loadWaitingList();
        this.setupEventListeners();
        this.updateCurrentDate();
    }

    // Dashboard Statistics
    async loadDashboardStats() {
        try {
            const response = await axios.get(`/api/teams/${this.currentTeamId}/dashboard`);
            const stats = response.data;
            
            document.getElementById('today-tasks').textContent = stats.todayTasks;
            document.getElementById('waiting-tasks').textContent = stats.waitingTasks;
            document.getElementById('today-events').textContent = stats.todayEvents;
            document.getElementById('overdue-tasks').textContent = stats.overdueTasks;
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }

    // Today's Schedule
    async loadTodaySchedule() {
        try {
            const today = this.formatDate(this.currentDate);
            
            // Load tasks for today
            const tasksResponse = await axios.get(`/api/teams/${this.currentTeamId}/tasks`, {
                params: { date: today }
            });
            
            // Load events for today
            const eventsResponse = await axios.get(`/api/teams/${this.currentTeamId}/events`, {
                params: { 
                    start_date: today,
                    end_date: today 
                }
            });
            
            const tasks = tasksResponse.data || [];
            const events = eventsResponse.data || [];
            
            this.renderTodaySchedule(tasks, events);
        } catch (error) {
            console.error('Error loading today schedule:', error);
            document.getElementById('today-schedule').innerHTML = '<p class="text-gray-500 text-center">No items scheduled for today</p>';
        }
    }

    renderTodaySchedule(tasks, events) {
        const container = document.getElementById('today-schedule');
        
        if (tasks.length === 0 && events.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center">No items scheduled for today</p>';
            return;
        }
        
        // Combine and sort by time
        const allItems = [
            ...tasks.map(task => ({ ...task, type: 'task', time: task.start_time || '09:00' })),
            ...events.map(event => ({ ...event, type: 'event', time: this.extractTime(event.start_datetime) }))
        ].sort((a, b) => a.time.localeCompare(b.time));
        
        container.innerHTML = allItems.map(item => {
            if (item.type === 'task') {
                return this.renderTaskItem(item);
            } else {
                return this.renderEventItem(item);
            }
        }).join('');
    }

    renderTaskItem(task) {
        const statusColor = task.status_color || '#6b7280';
        const projectColor = task.project_color || '#3b82f6';
        const isCompleted = task.is_completed;
        
        return `
            <div class="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer ${isCompleted ? 'opacity-50 bg-gray-50' : 'bg-white'}" 
                 data-task-id="${task.id}" onclick="app.toggleTaskComplete(${task.id}, ${!isCompleted})">
                <div class="flex-shrink-0">
                    <div class="w-4 h-4 rounded-full border-2" style="border-color: ${statusColor}; background-color: ${isCompleted ? statusColor : 'white'}">
                        ${isCompleted ? '<i class="fas fa-check text-white text-xs" style="font-size: 10px; margin-left: 1px;"></i>' : ''}
                    </div>
                </div>
                <div class="ml-3 flex-1">
                    <div class="flex items-center justify-between">
                        <p class="text-sm font-medium text-gray-900 ${isCompleted ? 'line-through' : ''}">${task.title}</p>
                        <span class="text-xs text-gray-500">${task.time}</span>
                    </div>
                    <div class="flex items-center mt-1">
                        ${task.project_name ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white" style="background-color: ${projectColor}">${task.project_name}</span>` : ''}
                        ${task.assignee_name ? `<span class="ml-2 text-xs text-gray-500"><i class="fas fa-user mr-1"></i>${task.assignee_name}</span>` : ''}
                        ${task.estimated_hours ? `<span class="ml-2 text-xs text-gray-500"><i class="fas fa-clock mr-1"></i>${task.estimated_hours}h</span>` : ''}
                    </div>
                </div>
                <div class="ml-2 flex-shrink-0">
                    <button class="text-gray-400 hover:text-gray-600" onclick="event.stopPropagation(); app.showTaskDetails(${task.id})">
                        <i class="fas fa-ellipsis-h"></i>
                    </button>
                </div>
            </div>
        `;
    }

    renderEventItem(event) {
        const startTime = this.extractTime(event.start_datetime);
        const endTime = this.extractTime(event.end_datetime);
        
        return `
            <div class="flex items-center p-3 border rounded-lg bg-blue-50 border-blue-200 cursor-pointer hover:bg-blue-100" 
                 data-event-id="${event.id}" onclick="app.showEventDetails(${event.id})">
                <div class="flex-shrink-0">
                    <div class="w-4 h-4 rounded-full bg-bordio-blue flex items-center justify-center">
                        <i class="fas fa-calendar text-white text-xs"></i>
                    </div>
                </div>
                <div class="ml-3 flex-1">
                    <div class="flex items-center justify-between">
                        <p class="text-sm font-medium text-gray-900">${event.title}</p>
                        <span class="text-xs text-gray-600">${startTime} - ${endTime}</span>
                    </div>
                    <div class="flex items-center mt-1">
                        ${event.project_name ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">${event.project_name}</span>` : ''}
                        ${event.location ? `<span class="ml-2 text-xs text-gray-600"><i class="fas fa-map-marker-alt mr-1"></i>${event.location}</span>` : ''}
                    </div>
                </div>
                <div class="ml-2 flex-shrink-0">
                    <button class="text-gray-400 hover:text-gray-600" onclick="event.stopPropagation(); app.showEventDetails(${event.id})">
                        <i class="fas fa-ellipsis-h"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // Waiting List
    async loadWaitingList() {
        try {
            const response = await axios.get(`/api/teams/${this.currentTeamId}/tasks`, {
                params: { waiting_list: 'true' }
            });
            
            const tasks = response.data || [];
            this.renderWaitingList(tasks);
        } catch (error) {
            console.error('Error loading waiting list:', error);
            document.getElementById('waiting-list').innerHTML = '<p class="text-gray-500 text-center text-sm">No waiting tasks</p>';
        }
    }

    renderWaitingList(tasks) {
        const container = document.getElementById('waiting-list');
        
        if (tasks.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center text-sm">No waiting tasks</p>';
            return;
        }
        
        container.innerHTML = tasks.map(task => {
            const priorityColors = {
                'low': 'text-gray-500',
                'medium': 'text-yellow-500',
                'high': 'text-orange-500',
                'urgent': 'text-red-500'
            };
            
            return `
                <div class="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer" 
                     data-task-id="${task.id}" onclick="app.scheduleTask(${task.id})">
                    <div class="flex-shrink-0">
                        <i class="fas fa-circle ${priorityColors[task.priority]} text-xs"></i>
                    </div>
                    <div class="ml-2 flex-1">
                        <p class="text-sm text-gray-900">${task.title}</p>
                        ${task.project_name ? `<p class="text-xs text-gray-500">${task.project_name}</p>` : ''}
                    </div>
                    <div class="ml-2 flex-shrink-0">
                        <button class="text-gray-400 hover:text-bordio-blue text-xs" title="Schedule task">
                            <i class="fas fa-calendar-plus"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Task Actions
    async toggleTaskComplete(taskId, completed) {
        try {
            await axios.put(`/api/tasks/${taskId}`, {
                is_completed: completed,
                completed_at: completed ? new Date().toISOString() : null,
                completed_by: completed ? this.currentUserId : null
            });
            
            await this.loadDashboardStats();
            await this.loadTodaySchedule();
        } catch (error) {
            console.error('Error updating task:', error);
        }
    }

    async scheduleTask(taskId) {
        const date = prompt('Schedule for date (YYYY-MM-DD):', this.formatDate(this.currentDate));
        if (!date) return;
        
        try {
            await axios.put(`/api/tasks/${taskId}`, {
                scheduled_date: date,
                is_waiting_list: false
            });
            
            await this.loadDashboardStats();
            await this.loadTodaySchedule();
            await this.loadWaitingList();
        } catch (error) {
            console.error('Error scheduling task:', error);
        }
    }

    showTaskDetails(taskId) {
        // Placeholder for task details modal
        alert(`Show task details for task ${taskId}`);
    }

    showEventDetails(eventId) {
        // Placeholder for event details modal
        alert(`Show event details for event ${eventId}`);
    }

    // Event Listeners
    setupEventListeners() {
        // Navigation buttons
        document.querySelector('.fas.fa-chevron-left').parentElement.addEventListener('click', () => {
            this.currentDate.setDate(this.currentDate.getDate() - 1);
            this.updateCurrentDate();
            this.loadTodaySchedule();
        });
        
        document.querySelector('.fas.fa-chevron-right').parentElement.addEventListener('click', () => {
            this.currentDate.setDate(this.currentDate.getDate() + 1);
            this.updateCurrentDate();
            this.loadTodaySchedule();
        });

        // Quick actions
        document.querySelectorAll('.w-full.text-left').forEach(button => {
            button.addEventListener('click', (e) => {
                const text = e.target.textContent;
                if (text.includes('Add Task')) {
                    this.showNewTaskModal();
                } else if (text.includes('Schedule Event')) {
                    this.showNewEventModal();
                } else if (text.includes('New Project')) {
                    this.showNewProjectModal();
                }
            });
        });

        // New Task button in navigation
        document.querySelector('.bg-bordio-blue').addEventListener('click', () => {
            this.showNewTaskModal();
        });
    }

    // Modal Functions (Placeholder implementations)
    showNewTaskModal() {
        const title = prompt('Task title:');
        if (!title) return;
        
        const description = prompt('Task description (optional):') || '';
        
        this.createTask({
            title,
            description,
            teamId: this.currentTeamId,
            creatorId: this.currentUserId,
            statusId: 1, // Default "New" status
            scheduledDate: this.formatDate(this.currentDate)
        });
    }

    showNewEventModal() {
        const title = prompt('Event title:');
        if (!title) return;
        
        const startTime = prompt('Start time (HH:MM):', '10:00');
        const duration = prompt('Duration in hours:', '1');
        
        if (!startTime) return;
        
        const startDatetime = `${this.formatDate(this.currentDate)}T${startTime}:00`;
        const endDate = new Date(startDatetime);
        endDate.setHours(endDate.getHours() + parseInt(duration));
        
        this.createEvent({
            title,
            teamId: this.currentTeamId,
            creatorId: this.currentUserId,
            startDatetime: startDatetime,
            endDatetime: endDate.toISOString().slice(0, 19)
        });
    }

    showNewProjectModal() {
        const name = prompt('Project name:');
        if (!name) return;
        
        const description = prompt('Project description (optional):') || '';
        
        this.createProject({
            name,
            description,
            teamId: this.currentTeamId,
            ownerId: this.currentUserId
        });
    }

    async createTask(taskData) {
        try {
            await axios.post(`/api/teams/${taskData.teamId}/tasks`, {
                title: taskData.title,
                description: taskData.description,
                creatorId: taskData.creatorId,
                statusId: taskData.statusId,
                scheduledDate: taskData.scheduledDate
            });
            
            await this.loadDashboardStats();
            await this.loadTodaySchedule();
        } catch (error) {
            console.error('Error creating task:', error);
            alert('Error creating task');
        }
    }

    async createEvent(eventData) {
        try {
            await axios.post(`/api/teams/${eventData.teamId}/events`, {
                title: eventData.title,
                creatorId: eventData.creatorId,
                startDatetime: eventData.startDatetime,
                endDatetime: eventData.endDatetime
            });
            
            await this.loadDashboardStats();
            await this.loadTodaySchedule();
        } catch (error) {
            console.error('Error creating event:', error);
            alert('Error creating event');
        }
    }

    async createProject(projectData) {
        try {
            await axios.post(`/api/teams/${projectData.teamId}/projects`, {
                name: projectData.name,
                description: projectData.description,
                ownerId: projectData.ownerId
            });
            
            alert('Project created successfully!');
        } catch (error) {
            console.error('Error creating project:', error);
            alert('Error creating project');
        }
    }

    // Utility Functions
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    extractTime(datetime) {
        return datetime ? datetime.slice(11, 16) : '';
    }

    updateCurrentDate() {
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        document.getElementById('current-date').textContent = this.currentDate.toLocaleDateString('en-US', options);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new BordioApp();
});

// Auto-refresh dashboard every 5 minutes
setInterval(() => {
    if (window.app) {
        window.app.loadDashboardStats();
    }
}, 5 * 60 * 1000);