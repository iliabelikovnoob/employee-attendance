import { useState, useEffect, Fragment } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { User, Attendance } from '@/types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { IoSend, IoTrashOutline, IoPencilOutline, IoSwapHorizontal } from 'react-icons/io5';
import ScheduleSwapModal from './ScheduleSwapModal';

interface DayComment {
  id: string;
  date: Date;
  text: string;
  type: 'NORMAL' | 'IMPORTANT' | 'CRITICAL' | 'INFO';
  createdAt: Date;
  user: {
    id: string;
    name: string;
    avatar?: string;
    position?: string;
  };
}

interface DayDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  users: User[];
  attendances: Attendance[];
  isAdmin: boolean;
  onRefresh: () => void;
}

// Конфигурация статусов
const STATUS_CONFIG = {
  OFFICE: { icon: '🏢', label: 'В офисе', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/20' },
  REMOTE: { icon: '🏠', label: 'Удаленно', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-900/20' },
  VACATION: { icon: '✈️', label: 'Отпуск', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
  SICK: { icon: '🤒', label: 'Больничный', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/20' },
  DAYOFF: { icon: '⚫', label: 'Отгул', color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-50 dark:bg-gray-800' },
  WEEKEND: { icon: '🏖️', label: 'Выходной', color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-900/20' },
};

// Типы комментариев
const COMMENT_TYPES = {
  NORMAL: { label: 'Обычный', icon: '📝', color: 'text-gray-700 dark:text-gray-300' },
  IMPORTANT: { label: 'Важный', icon: '⚠️', color: 'text-yellow-600 dark:text-yellow-400' },
  CRITICAL: { label: 'Критичный', icon: '🚨', color: 'text-red-600 dark:text-red-400' },
  INFO: { label: 'Информация', icon: 'ℹ️', color: 'text-blue-600 dark:text-blue-400' },
};

export default function DayDetailsModalEnhanced({
  isOpen,
  onClose,
  date,
  users,
  attendances,
  isAdmin,
  onRefresh,
}: DayDetailsModalProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<DayComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<'NORMAL' | 'IMPORTANT' | 'CRITICAL' | 'INFO'>('NORMAL');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  
  // Режим редактирования статусов
  const [editMode, setEditMode] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Record<string, string>>({}); // userId -> status
  const [showSwapModal, setShowSwapModal] = useState(false);

  // Группируем пользователей по статусам
  const usersByStatus = attendances.reduce((acc, att) => {
    const user = users.find(u => u.id === att.userId);
    if (user) {
      if (!acc[att.status]) {
        acc[att.status] = [];
      }
      acc[att.status].push(user);
    }
    return acc;
  }, {} as Record<string, User[]>);

  // Загружаем комментарии и инициализируем selectedUsers
  useEffect(() => {
    if (isOpen) {
      fetchComments();
      // Инициализируем selectedUsers из текущих посещений
      const initial: Record<string, string> = {};
      attendances.forEach(att => {
        initial[att.userId] = att.status;
      });
      setSelectedUsers(initial);
      setEditMode(false);
    }
  }, [isOpen, date, attendances]);

  const fetchComments = async () => {
    try {
      // Создаем дату начала дня в локальном времени
      const localDate = new Date(date);
      localDate.setHours(0, 0, 0, 0);
      
      const response = await fetch(`/api/comments?date=${localDate.toISOString()}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      // Создаем дату начала дня (00:00:00) в локальном времени
      const localDate = new Date(date);
      localDate.setHours(0, 0, 0, 0);
      
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: localDate.toISOString(),
          text: newComment,
          type: commentType,
        }),
      });

      if (response.ok) {
        const comment = await response.json();
        setComments([...comments, comment]);
        setNewComment('');
        setCommentType('NORMAL');
        toast.success('Комментарий добавлен');
      } else {
        toast.error('Ошибка при добавлении комментария');
      }
    } catch (error) {
      toast.error('Ошибка при добавлении комментария');
    } finally {
      setLoading(false);
    }
  };

  const handleEditComment = async (id: string) => {
    if (!editText.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/comments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editText }),
      });

      if (response.ok) {
        const updated = await response.json();
        setComments(comments.map(c => c.id === id ? updated : c));
        setEditingId(null);
        setEditText('');
        toast.success('Комментарий обновлен');
      } else {
        toast.error('Ошибка при обновлении комментария');
      }
    } catch (error) {
      toast.error('Ошибка при обновлении комментария');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm('Удалить комментарий?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/comments/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setComments(comments.filter(c => c.id !== id));
        toast.success('Комментарий удален');
      } else {
        toast.error('Ошибка при удалении комментария');
      }
    } catch (error) {
      toast.error('Ошибка при удалении комментария');
    } finally {
      setLoading(false);
    }
  };

  // Переключение статуса пользователя в режиме редактирования
  const handleToggleUserStatus = (userId: string, status: string) => {
    setSelectedUsers(prev => {
      const newState = { ...prev };
      if (newState[userId] === status) {
        // Если уже выбран этот статус - убираем пользователя
        delete newState[userId];
      } else {
        // Иначе устанавливаем новый статус
        newState[userId] = status;
      }
      return newState;
    });
  };

  // Сохранение изменений статусов
  const handleSaveStatuses = async () => {
    setLoading(true);
    try {
      const updates = Object.entries(selectedUsers).map(([userId, status]) => ({
        userId,
        status,
        date: date.toISOString(),
      }));

      const response = await fetch('/api/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendances: updates }),
      });

      if (response.ok) {
        toast.success('Статусы обновлены');
        setEditMode(false);
        onRefresh();
      } else {
        toast.error('Ошибка при обновлении статусов');
      }
    } catch (error) {
      toast.error('Ошибка при обновлении статусов');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Fragment>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={format(date, 'd MMMM yyyy, EEEE', { locale: ru })}
      size="lg"
    >
      <div className="space-y-6">
        {/* Сотрудники по статусам */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span>👥</span>
              <span>Сотрудники</span>
            </h3>
            
            {/* Кнопка редактирования доступна всем */}
            <div className="flex gap-2">
              {editMode ? (
                <>
                  <Button
                    onClick={handleSaveStatuses}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 text-sm"
                  >
                    💾 Сохранить
                  </Button>
                  <Button
                    onClick={() => {
                      setEditMode(false);
                      // Сбросить к начальному состоянию
                      const initial: Record<string, string> = {};
                      attendances.forEach(att => {
                        initial[att.userId] = att.status;
                      });
                      setSelectedUsers(initial);
                    }}
                    variant="secondary"
                    className="text-sm"
                  >
                    ❌ Отмена
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => setEditMode(true)}
                    variant="secondary"
                    className="text-sm"
                  >
                    ✏️ Изменить статусы
                  </Button>
                  {!isAdmin && (
                    <Button
                      onClick={() => setShowSwapModal(true)}
                      variant="secondary"
                      className="text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50"
                    >
                      <IoSwapHorizontal className="w-4 h-4" />
                      Обменяться
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {editMode ? (
            // Режим редактирования - показываем всех пользователей по статусам
            <div className="space-y-3">
              {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => (
                <div
                  key={statusKey}
                  className={`rounded-lg p-4 ${config.bgColor} border border-gray-200 dark:border-gray-700`}
                >
                  <div className={`font-semibold mb-3 ${config.color} flex items-center gap-2`}>
                    <span className="text-xl">{config.icon}</span>
                    <span>{config.label}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {users.map(user => {
                      const isSelected = selectedUsers[user.id] === statusKey;
                      return (
                        <button
                          key={user.id}
                          onClick={() => handleToggleUserStatus(user.id, statusKey)}
                          className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                            isSelected
                              ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500'
                              : 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                              {user.name.charAt(0)}
                            </div>
                          )}
                          <div className="text-left flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.name}
                            </div>
                            {user.position && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {user.position}
                              </div>
                            )}
                          </div>
                          {isSelected && <span className="text-blue-600 dark:text-blue-400">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Обычный режим просмотра
            Object.keys(usersByStatus).length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Нет данных о присутствии
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(usersByStatus).map(([status, statusUsers]) => {
                  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
                  if (!config) return null;

                  return (
                    <div
                      key={status}
                      className={`rounded-lg p-4 ${config.bgColor} border border-gray-200 dark:border-gray-700`}
                    >
                      <div className={`font-semibold mb-2 ${config.color} flex items-center gap-2`}>
                        <span className="text-xl">{config.icon}</span>
                        <span>{config.label} ({statusUsers.length})</span>
                      </div>
                      <div className="pl-8 space-y-1">
                        {statusUsers.map(user => (
                          <div key={user.id} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.name} className="w-6 h-6 rounded-full" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-semibold">{user.name.charAt(0)}</div>
                            )}
                            <span>{user.name}</span>
                            {user.position && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">• {user.position}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Разделитель */}
        <div className="border-t border-gray-200 dark:border-gray-700"></div>

        {/* Комментарии */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span>💬</span>
            <span>Комментарии ({comments.length})</span>
          </h3>

          {/* Список комментариев */}
          <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto">
            {comments.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Нет комментариев
              </div>
            ) : (
              comments.map(comment => (
                <div
                  key={comment.id}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {comment.user.avatar ? (
                        <img src={comment.user.avatar} alt={comment.user.name} className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                          {comment.user.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{comment.user.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(comment.createdAt), 'HH:mm, d MMM', { locale: ru })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg ${COMMENT_TYPES[comment.type].color}`}>
                        {COMMENT_TYPES[comment.type].icon}
                      </span>
                      {(session?.user?.id === comment.user.id || isAdmin) && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingId(comment.id);
                              setEditText(comment.text);
                            }}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                            title="Редактировать"
                          >
                            <IoPencilOutline className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </button>
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                            title="Удалить"
                          >
                            <IoTrashOutline className="w-4 h-4 text-red-600 dark:text-red-400" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {editingId === comment.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditComment(comment.id)}
                          disabled={loading}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                        >
                          Сохранить
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditText('');
                          }}
                          className="px-3 py-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded text-sm"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-700 dark:text-gray-200 text-sm whitespace-pre-wrap">
                      {comment.text}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Форма нового комментария */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Новый комментарий
              </label>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Введите комментарий..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {Object.entries(COMMENT_TYPES).map(([type, config]) => (
                  <button
                    key={type}
                    onClick={() => setCommentType(type as any)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      commentType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    title={config.label}
                  >
                    {config.icon}
                  </button>
                ))}
              </div>

              <Button
                onClick={handleAddComment}
                disabled={loading || !newComment.trim()}
                className="flex items-center gap-2"
              >
                <IoSend className="w-4 h-4" />
                <span>Отправить</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>

    {/* Schedule Swap Modal */}
    {!isAdmin && (
      <ScheduleSwapModal
        isOpen={showSwapModal}
        onClose={() => setShowSwapModal(false)}
        onSuccess={() => {
          onRefresh();
        }}
        currentUserId={session?.user?.id || ''}
        date={date}
        currentUserStatus={
          attendances.find((att) => att.userId === session?.user?.id)?.status || 'OFFICE'
        }
        allUsers={users}
        attendances={attendances}
      />
    )}
  </Fragment>
  );
}
