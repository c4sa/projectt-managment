import React, { useState, useEffect } from 'react';
import { dataStore, Task, TaskStatus, TaskPriority } from '../../data/store';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Plus, Calendar, User, MoreVertical } from 'lucide-react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface Props {
  projectId: string;
}

const statusColumns: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'todo', label: 'To Do', color: 'bg-gray-100' },
  { status: 'in_progress', label: 'In Progress', color: 'bg-blue-100' },
  { status: 'review', label: 'Review', color: 'bg-yellow-100' },
  { status: 'done', label: 'Done', color: 'bg-green-100' },
];

interface DraggableTaskProps {
  task: Task;
  onUpdate: () => void;
}

function DraggableTask({ task, onUpdate }: DraggableTaskProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'task',
    item: { id: task.id, status: task.status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
    }
  };

  return (
    <div
      ref={drag}
      className={`p-3 bg-white border rounded-lg cursor-move hover:shadow-md transition-shadow ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-sm">{task.title}</h4>
        <Badge className={`${getPriorityColor(task.priority)} text-xs`}>
          {task.priority}
        </Badge>
      </div>
      {task.description && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{task.description}</p>
      )}
      <div className="flex items-center justify-between text-xs text-gray-500">
        {task.dueDate && (
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(task.dueDate).toLocaleDateString()}
          </div>
        )}
        {task.assignees.length > 0 && (
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {task.assignees.length}
          </div>
        )}
      </div>
    </div>
  );
}

interface DroppableColumnProps {
  status: TaskStatus;
  label: string;
  color: string;
  tasks: Task[];
  onDrop: (taskId: string, newStatus: TaskStatus) => void;
  onUpdate: () => void;
}

function DroppableColumn({ status, label, color, tasks, onDrop, onUpdate }: DroppableColumnProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'task',
    drop: (item: { id: string; status: TaskStatus }) => {
      if (item.status !== status) {
        onDrop(item.id, status);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <div ref={drop} className={`flex-1 min-w-[280px] ${isOver ? 'bg-blue-50' : ''} rounded-lg p-4 transition-colors`}>
      <div className={`${color} rounded-lg p-3 mb-4`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{label}</h3>
          <Badge variant="secondary">{tasks.length}</Badge>
        </div>
      </div>
      <div className="space-y-3">
        {tasks.map((task) => (
          <DraggableTask key={task.id} task={task} onUpdate={onUpdate} />
        ))}
      </div>
    </div>
  );
}

export function ProjectTasksTab({ projectId }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadTasks = async () => {
    const data = await dataStore.getTasks(projectId);
    setTasks(data);
  };

  useEffect(() => {
    loadTasks();
  }, [projectId]);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority,
    dueDate: '',
  });

  const handleCreateTask = async () => {
    await dataStore.addTask({
      projectId,
      ...newTask,
      assignees: [],
      dependencies: [],
      customFields: {},
      comments: [],
    });
    await loadTasks();
    setDialogOpen(false);
    setNewTask({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: '',
    });
  };

  const handleTaskDrop = async (taskId: string, newStatus: TaskStatus) => {
    await dataStore.updateTask(taskId, { status: newStatus });
    await loadTasks();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs value={view} onValueChange={(v) => setView(v as 'kanban' | 'list')}>
          <TabsList>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
          </TabsList>
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#7A1516] hover:bg-[#5A1012]">
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Task Title</Label>
                <Input
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Enter task title"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Task description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={newTask.status} onValueChange={(value) => setNewTask({ ...newTask, status: value as TaskStatus })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={newTask.priority} onValueChange={(value) => setNewTask({ ...newTask, priority: value as TaskPriority })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTask} className="bg-[#7A1516] hover:bg-[#5A1012]">
                  Create Task
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {view === 'kanban' ? (
        <DndProvider backend={HTML5Backend}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {statusColumns.map((column) => {
              const columnTasks = tasks.filter((task) => task.status === column.status);
              return (
                <DroppableColumn
                  key={column.status}
                  {...column}
                  tasks={columnTasks}
                  onDrop={handleTaskDrop}
                  onUpdate={loadTasks}
                />
              );
            })}
          </div>
        </DndProvider>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <h4 className="font-medium">{task.title}</h4>
                    {task.description && <p className="text-sm text-gray-500 mt-1">{task.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="capitalize">{task.status.replace('_', ' ')}</Badge>
                    <Badge variant="outline" className="capitalize">{task.priority}</Badge>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No tasks yet. Create your first task!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
