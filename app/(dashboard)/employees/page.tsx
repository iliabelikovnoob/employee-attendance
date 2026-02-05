'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';
import Button from '@/components/ui/Button';
import { IoAdd, IoTrash, IoPencil } from 'react-icons/io5';
import { toast } from 'react-hot-toast';
import UserFormModal from '@/components/modals/UserFormModal';

export default function EmployeesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      toast.error('Ошибка загрузки сотрудников');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Удалить сотрудника ${name}?`)) return;

    try {
      const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      toast.success('Сотрудник удален');
      fetchUsers();
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  const handleSuccess = () => {
    setShowModal(false);
    setEditingUser(null);
    fetchUsers();
    toast.success(editingUser ? 'Сотрудник обновлен' : 'Сотрудник создан');
  };

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">Сотрудники</h1>
        <Button onClick={() => setShowModal(true)}>
          <IoAdd /> Добавить сотрудника
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">
                Сотрудник
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">
                Контакты
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">
                Должность
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">
                Роль
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:hover:bg-gray-700">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                        {user.name.charAt(0)}
                      </div>
                    )}
                    <span className="font-medium">{user.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">{user.email}</div>
                  {user.phone && <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{user.phone}</div>}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white dark:text-white">{user.position || '-'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                    {user.role === 'ADMIN' ? 'Админ' : 'Сотрудник'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => { setEditingUser(user); setShowModal(true); }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg mr-2"
                  >
                    <IoPencil />
                  </button>
                  <button
                    onClick={() => handleDelete(user.id, user.name)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <IoTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <UserFormModal
          isOpen={showModal}
          onClose={() => { setShowModal(false); setEditingUser(null); }}
          user={editingUser}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
