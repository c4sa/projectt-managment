import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { dataStore } from '../../data/store';
import type { DocumentComment } from '../../types/project';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { MessageCircle, Send, Edit, Trash2, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { usePermissionsMatrix } from '../../contexts/PermissionsMatrixContext';

interface DocumentChatThreadProps {
  documentId: string;
  documentName?: string;
}

export function DocumentChatThread({ documentId, documentName }: DocumentChatThreadProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { hasPermission } = usePermissionsMatrix();
  const canDeleteComments = hasPermission('documents', 'delete');
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    dataStore.getDocumentComments(documentId).then((data) => {
      if (mounted) {
        setComments(data);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [documentId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const handleSendMessage = async () => {
    if (!message.trim() || !user) return;

    try {
      const newComment = await dataStore.addDocumentComment({
        documentId,
        userId: user.id,
        userName: user.name,
        message: message.trim(),
      });
      setComments((prev) => [...prev, newComment]);
      setMessage('');
      toast.success(t('documents.commentAdded'));
    } catch (err: any) {
      toast.error(err.message || 'Failed to add comment');
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editingMessage.trim()) return;

    try {
      const updated = await dataStore.updateDocumentComment(commentId, {
        message: editingMessage.trim(),
        edited: true,
        editedAt: new Date().toISOString(),
      });
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? updated : c))
      );
      setEditingCommentId(null);
      setEditingMessage('');
      toast.success(t('documents.commentUpdated'));
    } catch (err: any) {
      toast.error(err.message || 'Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await dataStore.deleteDocumentComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success(t('documents.commentDeleted'));
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete comment');
    }
  };

  const startEdit = (comment: DocumentComment) => {
    setEditingCommentId(comment.id);
    setEditingMessage(comment.message);
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setEditingMessage('');
  };

  const timestamp = (c: DocumentComment) => c.editedAt || c.createdAt;

  if (loading) {
    return (
      <Card className="h-[400px] flex items-center justify-center">
        <p className="text-gray-500">Loading comments...</p>
      </Card>
    );
  }

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          {t('documents.discussion')}
        </CardTitle>
        <CardDescription>
          {comments.length} {t('documents.comments')}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          {comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 py-8">
              <MessageCircle className="w-12 h-12 mb-3 text-gray-400" />
              <p className="text-sm">{t('documents.noComments')}</p>
              <p className="text-xs mt-1">{t('documents.startDiscussion')}</p>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="bg-[#7A1516] text-white text-xs">
                      {comment.userName?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-medium text-sm">{comment.userName}</span>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(timestamp(comment)), { addSuffix: true })}
                      </span>
                      {comment.edited && (
                        <span className="text-xs text-gray-400 italic">
                          ({t('documents.edited')})
                        </span>
                      )}
                    </div>

                    {editingCommentId === comment.id ? (
                      <div className="space-y-2">
                        <Input
                          value={editingMessage}
                          onChange={(e) => setEditingMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleEditComment(comment.id);
                            }
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleEditComment(comment.id)}
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
                      <div className="group relative">
                        <p className="text-sm bg-gray-100 rounded-lg px-3 py-2 inline-block max-w-full break-words">
                          {comment.message}
                        </p>
                        {user?.id === comment.userId && (
                          <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <MoreVertical className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => startEdit(comment)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  {t('common.edit')}
                                </DropdownMenuItem>
                                {canDeleteComments && (
                                <DropdownMenuItem
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  {t('common.delete')}
                                </DropdownMenuItem>
                                )}
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
        </ScrollArea>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={t('documents.typeMessage')}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="bg-[#7A1516] hover:bg-[#5A1012]"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {t('documents.onlyProjectMembers')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
