import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { dataStore } from '../../data/store';
import type { ProjectChatMessage } from '../../types/project';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { MessageCircle, Send, Edit, Trash2, MoreVertical, Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface ProjectChatTabProps {
  projectId: string;
  projectName?: string;
  teamMemberCount?: number;
}

export function ProjectChatTab({ projectId, projectName, teamMemberCount }: ProjectChatTabProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [messages, setMessages] = useState<ProjectChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    dataStore.getProjectChatMessages(projectId).then((data) => {
      if (mounted) {
        setMessages(data);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [projectId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !user) return;

    try {
      const newMsg = await dataStore.addProjectChatMessage({
        projectId,
        userId: user.id,
        userName: user.name ?? '',
        message: message.trim(),
      });
      setMessages((prev) => [...prev, newMsg]);
      setMessage('');
      toast.success(t('project.chat.messageSent'));
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    }
  };

  const handleEdit = async (msgId: string) => {
    if (!editingText.trim()) return;

    try {
      const updated = await dataStore.updateProjectChatMessage(msgId, {
        message: editingText.trim(),
        edited: true,
        editedAt: new Date().toISOString(),
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? updated : m))
      );
      setEditingMessageId(null);
      setEditingText('');
      toast.success(t('project.chat.messageUpdated'));
    } catch (err: any) {
      toast.error(err.message || 'Failed to update message');
    }
  };

  const handleDelete = async (msgId: string) => {
    try {
      await dataStore.deleteProjectChatMessage(msgId);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      toast.success(t('project.chat.messageDeleted'));
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete message');
    }
  };

  const startEdit = (msg: ProjectChatMessage) => {
    setEditingMessageId(msg.id);
    setEditingText(msg.message);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  const timestamp = (m: ProjectChatMessage) => m.editedAt || m.createdAt;

  if (loading) {
    return (
      <Card className="min-h-[500px] flex items-center justify-center">
        <p className="text-gray-500">{t('common.loading')}</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col min-h-[540px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-[#7A1516]" />
          {t('project.chat.title')}
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          {projectName && (
            <span className="font-medium text-foreground">{projectName}</span>
          )}
          {teamMemberCount !== undefined && (
            <span className="flex items-center gap-1 text-gray-500">
              <Users className="w-3.5 h-3.5" />
              {teamMemberCount} {t('project.chat.teamMembers')}
            </span>
          )}
          <span className="text-gray-400">•</span>
          <span>{messages.length} {t('project.chat.messages')}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 min-h-[280px] max-h-[400px]"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[280px] text-gray-500 py-8">
              <MessageCircle className="w-14 h-14 mb-4 text-gray-300" />
              <p className="text-sm font-medium">{t('project.chat.noMessages')}</p>
              <p className="text-xs mt-2 text-gray-400 max-w-xs text-center">
                {t('project.chat.startConversation')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className="flex gap-3 group">
                  <div className="w-9 h-9 rounded-full bg-[#7A1516] text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                    {msg.userName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="font-medium text-sm">{msg.userName}</span>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(timestamp(msg)), { addSuffix: true })}
                      </span>
                      {msg.edited && (
                        <span className="text-xs text-gray-400 italic">
                          ({t('documents.edited')})
                        </span>
                      )}
                    </div>

                    {editingMessageId === msg.id ? (
                      <div className="space-y-2 mt-1">
                        <Input
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleEdit(msg.id);
                            }
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          autoFocus
                          className="max-w-md"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleEdit(msg.id)}
                            className="bg-[#7A1516] hover:bg-[#5A1012]"
                          >
                            {t('common.save')}
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            {t('common.cancel')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="group/item relative">
                        <p className="text-sm bg-gray-100 rounded-lg px-3 py-2 inline-block max-w-full break-words">
                          {msg.message}
                        </p>
                        {user?.id === msg.userId && (
                          <div className="absolute -top-1 right-0 opacity-0 group-hover/item:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => startEdit(msg)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  {t('common.edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(msg.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  {t('common.delete')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t p-4 bg-gray-50/50">
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={t('project.chat.typeMessage')}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!message.trim()}
              className="bg-[#7A1516] hover:bg-[#5A1012] shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {t('project.chat.teamMembersOnly')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
