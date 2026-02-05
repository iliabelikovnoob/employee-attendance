'use client';

import { useState, useRef } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { User } from '@/types';
import { IoCamera } from 'react-icons/io5';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSuccess: () => void;
}

export default function UserFormModal({ isOpen, onClose, user, onSuccess }: UserFormModalProps) {
  const [formData, setFormData] = useState({
    email: user?.email || '',
    password: '',
    name: user?.name || '',
    phone: user?.phone || '',
    position: user?.position || '',
    skills: user?.skills || '',
    role: user?.role || 'USER',
  });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value) formDataToSend.append(key, value);
      });
      if (avatar) formDataToSend.append('avatar', avatar);

      const url = user ? `/api/users/${user.id}` : '/api/users';
      const method = user ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        body: formDataToSend,
      });

      if (!response.ok) throw new Error();

      onSuccess();
    } catch (error) {
      alert('Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={user ? 'Редактировать' : 'Добавить сотрудника'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex justify-center mb-4">
          <div className="relative">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-24 h-24 rounded-full object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-3xl text-gray-400 dark:text-gray-500">
                {formData.name.charAt(0) || '?'}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
            >
              <IoCamera />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">ФИО *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Пароль {!user && '*'}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!user}
              placeholder={user ? 'Оставьте пустым' : ''}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Телефон</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Должность</label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Профиль знаний</label>
            <textarea
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg resize-none"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Роль</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="USER">Сотрудник</option>
              <option value="ADMIN">Администратор</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Отмена
          </Button>
          <Button type="submit" loading={loading}>
            {user ? 'Сохранить' : 'Создать'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
