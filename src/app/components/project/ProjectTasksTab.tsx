import React, { useState, useEffect } from 'react';
import { dataStore, Task, TaskStatus, TaskPriority, Project, SystemUser } from '../../data/store';
import { usePermissionsMatrix } from '../../contexts/PermissionsMatrixContext';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Plus, Calendar, User, Edit2, Trash2 } from 'lucide-react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { toast } from 'sonner';

interface Props {
  projectId: string;
  project?: Project;
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
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  canDrag: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

function DraggableTask({ task, onUpdate, onEdit, onDelete, canDrag, canEdit, canDelete }: DraggableTaskProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'task',
    item: { id: task.id, status: task.status },
    canDrag,
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

  const hasActions = canEdit || canDelete;

  return (
    <div
      ref={canDrag ? drag : undefined}
      className={`p-3 bg-white border rounded-lg hover:shadow-md transition-shadow ${
        canDrag ? 'cursor-move' : ''
      } ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-sm flex-1 min-w-0">{task.title}</h4>
        <div className="flex items-center gap-1 flex-shrink-0">
          {hasActions && (
            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                  aria-label="Edit task"
                >
                  <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={(e) => { e.stopPropagation(); onDelete(task); }}
                  aria-label="Delete task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          )}
          <Badge className={`${getPriorityColor(task.priority)} text-xs`}>
            {task.priority}
          </Badge>
        </div>
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
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  canDrop: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

function DroppableColumn({ status, label, color, tasks, onDrop, onUpdate, onEdit, onDelete, canDrop, canEdit, canDelete }: DroppableColumnProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'task',
    drop: (item: { id: string; status: TaskStatus }) => {
      if (canDrop && item.status !== status) {
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
          <DraggableTask
            key={task.id}
            task={task}
            onUpdate={onUpdate}
            onEdit={onEdit}
            onDelete={onDelete}
            canDrag={canDrop}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        ))}
      </div>
    </div>
  );
}

export function ProjectTasksTab({ projectId, project }: Props) {
  const { hasPermission } = usePermissionsMatrix();
  const canCreateTask = hasPermission('tasks', 'create');
  const canEditTask = hasPermission('tasks', 'edit');
  const canDeleteTask = hasPermission('tasks', 'delete');
  const canUpdateTasks = hasPermission('tasks', 'edit') || hasPermission('tasks', 'update_status');
  const canAssignTasks = hasPermission('tasks', 'assign');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const loadTasks = async () => {
    const data = await dataStore.getTasks(projectId);
    setTasks(data);
  };

  useEffect(() => {
    loadTasks();
  }, [projectId]);

  useEffect(() => {
    if (editDialogOpen || dialogOpen) {
      dataStore.getUsers().then(setUsers);
    }
  }, [editDialogOpen, dialogOpen]);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority,
    dueDate: '',
  });

  const [editTaskForm, setEditTaskForm] = useState({
    title: '',
    description: '',
    status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority,
    dueDate: '',
    assignees: [] as string[],
    dependencies: [] as string[],
  });

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      toast.error('Task title is required');
      return;
    }
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
    toast.success('Task created');
  };

  const handleOpenEdit = (task: Task) => {
    if (!canEditTask) return;
    setEditingTask(task);
    setEditTaskForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate || '',
      assignees: task.assignees || [],
      dependencies: task.dependencies || [],
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingTask) return;
    if (!editTaskForm.title.trim()) {
      toast.error('Task title is required');
      return;
    }
    await dataStore.updateTask(editingTask.id, {
      title: editTaskForm.title,
      description: editTaskForm.description || undefined,
      status: editTaskForm.status,
      priority: editTaskForm.priority,
      dueDate: editTaskForm.dueDate || undefined,
      assignees: canAssignTasks ? editTaskForm.assignees : editingTask.assignees,
      dependencies: editTaskForm.dependencies,
    });
    await loadTasks();
    setEditDialogOpen(false);
    setEditingTask(null);
    toast.success('Task updated');
  };

  const handleDeleteTask = async (task: Task) => {
    if (!canDeleteTask) return;
    if (!confirm(`Are you sure you want to delete "${task.title}"?`)) return;
    await dataStore.deleteTask(task.id);
    await loadTasks();
    setEditDialogOpen(false);
    setEditingTask(null);
    toast.success('Task deleted');
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

        {canCreateTask && (
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
                <Button
                  onClick={handleCreateTask}
                  className="bg-[#7A1516] hover:bg-[#5A1012]"
                  disabled={!newTask.title.trim()}
                >
                  Create Task
                </Button>
              </div>
            </div>
          </DialogContent>
          </Dialog>
        )}
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
                  onEdit={handleOpenEdit}
                  onDelete={handleDeleteTask}
                  canDrop={canUpdateTasks}
                  canEdit={canEditTask}
                  canDelete={canDeleteTask}
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
                <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium">{task.title}</h4>
                    {task.description && <p className="text-sm text-gray-500 mt-1">{task.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className="capitalize">{task.status.replace('_', ' ')}</Badge>
                    <Badge variant="outline" className="capitalize">{task.priority}</Badge>
                    {canEditTask && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(task)} aria-label="Edit task">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                    {canDeleteTask && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteTask(task)}
                        aria-label="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
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

      {/* Edit Task Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Task Title</Label>
                <Input
                  value={editTaskForm.title}
                  onChange={(e) => setEditTaskForm({ ...editTaskForm, title: e.target.value })}
                  placeholder="Enter task title"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editTaskForm.description}
                  onChange={(e) => setEditTaskForm({ ...editTaskForm, description: e.target.value })}
                  placeholder="Task description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editTaskForm.status}
                    onValueChange={(value) => setEditTaskForm({ ...editTaskForm, status: value as TaskStatus })}
                  >
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
                  <Select
                    value={editTaskForm.priority}
                    onValueChange={(value) => setEditTaskForm({ ...editTaskForm, priority: value as TaskPriority })}
                  >
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
                  value={editTaskForm.dueDate}
                  onChange={(e) => setEditTaskForm({ ...editTaskForm, dueDate: e.target.value })}
                />
              </div>

              {canAssignTasks && (
                <div className="space-y-2">
                  <Label>Assignees</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start font-normal">
                        {editTaskForm.assignees.length === 0
                          ? 'Select assignees...'
                          : `${editTaskForm.assignees.length} assignee(s) selected`}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-0" align="start">
                      <ScrollArea className="h-48">
                        <div className="p-2 space-y-2">
                          {users.map((u) => (
                            <label
                              key={u.id}
                              className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 cursor-pointer"
                            >
                              <Checkbox
                                checked={editTaskForm.assignees.includes(u.id)}
                                onCheckedChange={(checked) => {
                                  const next = checked
                                    ? [...editTaskForm.assignees, u.id]
                                    : editTaskForm.assignees.filter((id) => id !== u.id);
                                  setEditTaskForm({ ...editTaskForm, assignees: next });
                                }}
                              />
                              <span className="text-sm">{u.name}</span>
                            </label>
                          ))}
                          {users.length === 0 && (
                            <p className="text-sm text-gray-500 p-2">No users available</p>
                          )}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <div className="space-y-2">
                <Label>Dependencies</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start font-normal">
                      {editTaskForm.dependencies.length === 0
                        ? 'Select dependencies...'
                        : `${editTaskForm.dependencies.length} task(s) selected`}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0" align="start">
                    <ScrollArea className="h-48">
                      <div className="p-2 space-y-2">
                        {tasks
                          .filter((t) => t.id !== editingTask.id)
                          .map((t) => (
                            <label
                              key={t.id}
                              className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 cursor-pointer"
                            >
                              <Checkbox
                                checked={editTaskForm.dependencies.includes(t.id)}
                                onCheckedChange={(checked) => {
                                  const next = checked
                                    ? [...editTaskForm.dependencies, t.id]
                                    : editTaskForm.dependencies.filter((id) => id !== t.id);
                                  setEditTaskForm({ ...editTaskForm, dependencies: next });
                                }}
                              />
                              <span className="text-sm truncate flex-1">{t.title}</span>
                            </label>
                          ))}
                        {tasks.filter((t) => t.id !== editingTask.id).length === 0 && (
                          <p className="text-sm text-gray-500 p-2">No other tasks available</p>
                        )}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex justify-between pt-4">
                <div>
                  {canDeleteTask && (
                    <Button
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                      onClick={() => handleDeleteTask(editingTask)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEdit} className="bg-[#7A1516] hover:bg-[#5A1012]">
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
