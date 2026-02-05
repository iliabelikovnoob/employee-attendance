'use client';

import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { formatDate } from '@/lib/calendar';
import { Attendance, User, StatusLabels, StatusColors, StatusEmojis, AttendanceStatus } from '@/types';
import { toast } from 'react-hot-toast';
import UpdateStatusModal from './UpdateStatusModal';
import RequestChangeModal from './RequestChangeModal';

interface DayDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  users: User[];
  attendances: Attendance[];
  isAdmin: boolean;
  onRefresh: () => void;
}

export default function DayDetailsModal({
  isOpen,
  onClose,
  date,
  users,
  attendances,
  isAdmin,
  onRefresh,
}: DayDetailsModalProps) {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Создаем map пользователь -> статус
  const userStatusMap = attendances.reduce((acc, att) => {
    acc[att.userId] = att.status;
    return acc;
  }, {} as Record<string, AttendanceStatus>);

  // Группируем пользователей по статусу
  const usersByStatus = users.reduce((acc, user) => {
    const status = userStatusMap[user.id] || 'UNKNOWN';
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(user);
    return acc;
  }, {} as Record<string, User[]>);

  const handleUpdateSuccess = () => {
    setShowUpdateModal(false);
    onRefresh();
    toast.success('Статусы обновлены');
  };

  const handleRequestSuccess = () => {
    setShowRequestModal(false);
    toast.success('Запрос отправлен');
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={formatDate(date, 'dd MMMM yyyy, EEEE')} size="lg">
        <div className="space-y-6">
          {/* Actions */}
          <div className="flex gap-3">
            {isAdmin && (
              <Button onClick={() => setShowUpdateModal(true)}>
                Изменить статусы
              </Button>
            )}
            {!isAdmin && (
              <Button onClick={() => setShowRequestModal(true)}>
                Запросить изменение
              </Button>
            )}
          </div>

          {/* Users by status */}
          <div className="space-y-4">
            {Object.entries(StatusLabels).map(([status, label]) => {
              const usersWithStatus = usersByStatus[status] || [];
              const unknownUsers = usersByStatus['UNKNOWN'] || [];
              
              // Показываем секцию только если есть пользователи с этим статусом
              // Или если это первый статус и есть пользователи без статуса
              const shouldShow = usersWithStatus.length > 0 || 
                (status === 'OFFICE' && unknownUsers.length > 0);

              if (!shouldShow) return null;

              const allUsers = status === 'OFFICE' 
                ? [...usersWithStatus, ...unknownUsers]
                : usersWithStatus;

              return (
                <div key={status} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{StatusEmojis[status as AttendanceStatus]}</span>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white">{label}</h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">({allUsers.length})</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {allUsers.map((user) => (
                      <div key={user.id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-10 h-10 rounded-full object-cover"
                            style={{ 
                              border: `2px solid ${StatusColors[status as AttendanceStatus] || '#e5e7eb'}` 
                            }}
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                            style={{
                              backgroundColor: StatusColors[status as AttendanceStatus] || '#e5e7eb',
                              border: `2px solid ${StatusColors[status as AttendanceStatus] || '#e5e7eb'}`,
                            }}
                          >
                            {user.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white dark:text-white">{user.name}</div>
                          {user.position && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{user.position}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {Object.keys(usersByStatus).length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">
                Нет данных о посещаемости на эту дату
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Update Status Modal (Admin) */}
      {showUpdateModal && (
        <UpdateStatusModal
          isOpen={showUpdateModal}
          onClose={() => setShowUpdateModal(false)}
          date={date}
          users={users}
          currentStatuses={userStatusMap}
          onSuccess={handleUpdateSuccess}
        />
      )}

      {/* Request Change Modal (User) */}
      {showRequestModal && (
        <RequestChangeModal
          isOpen={showRequestModal}
          onClose={() => setShowRequestModal(false)}
          date={date}
          onSuccess={handleRequestSuccess}
        />
      )}
    </>
  );
}
