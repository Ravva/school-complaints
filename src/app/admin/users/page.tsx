"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { getAllUsers, updateUserRole, setUserBlockedStatus } from '@/lib/firebase/firestoreService';
import type { UserData, UserRole } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from "@/components/ui/switch"; // Компонент для блокировки
import { Label } from "@/components/ui/label";
import Link from 'next/link';

// Функция форматирования Timestamp
const formatTimestamp = (timestamp: any): string => {
  if (!timestamp || !timestamp.toDate) return 'Неизвестно';
  try { return timestamp.toDate().toLocaleString('ru-RU'); }
  catch (e) { console.error("Error formatting timestamp:", e); return 'Неверная дата'; }
};

// Все возможные роли для выбора
const allRoles: UserRole[] = ['student', 'parent', 'teacher', 'admin'];

export default function ManageUsersPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null); // Для индикации загрузки при обновлении

  // Загрузка данных и проверка прав
  useEffect(() => {
    if (!authLoading) {
      if (!user || userData?.role !== 'admin') {
        router.push('/'); // Доступ только админам
        return;
      }
      setLoadingData(true);
      setError(null);
      getAllUsers()
        .then(data => setUsers(data))
        .catch(err => {
          console.error("Ошибка загрузки пользователей:", err);
          setError("Не удалось загрузить список пользователей.");
        })
        .finally(() => setLoadingData(false));
    }
  }, [user, userData, authLoading, router]);

  // Обработчик изменения роли
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (userData?.uid === userId && newRole !== 'admin') {
        alert("Вы не можете понизить свою собственную роль администратора.");
        return; // Предотвращаем случайное понижение своей роли
    }
    setUpdatingUserId(userId);
    try {
      await updateUserRole(userId, newRole);
      // Обновляем состояние локально для немедленного отображения
      setUsers(prevUsers => prevUsers.map(u => u.uid === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert(`Ошибка обновления роли: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Обработчик изменения статуса блокировки
  const handleBlockChange = async (userId: string, block: boolean) => {
     if (userData?.uid === userId) {
        alert("Вы не можете заблокировать самого себя.");
        return; // Предотвращаем самоблокировку
    }
    setUpdatingUserId(userId);
    try {
      await setUserBlockedStatus(userId, block);
      // Обновляем состояние локально
      setUsers(prevUsers => prevUsers.map(u => u.uid === userId ? { ...u, isBlocked: block } : u));
    } catch (err) {
      alert(`Ошибка изменения статуса блокировки: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setUpdatingUserId(null);
    }
  };


  // Рендеринг состояний загрузки/ошибки/доступа
  if (authLoading || loadingData) {
    return <div className="flex items-center justify-center min-h-screen"><p>Загрузка управления пользователями...</p></div>;
  }
  if (userData?.role !== 'admin') {
     return <div className="container mx-auto py-10 text-center"><p className="text-destructive">Доступ запрещен.</p><Link href="/" passHref><Button variant="link" className="mt-4">На главную</Button></Link></div>;
   }
  if (error) {
     return <div className="container mx-auto py-10 text-center"><p className="text-destructive">{error}</p><Link href="/" passHref><Button variant="link" className="mt-4">На главную</Button></Link></div>;
  }

  // Основной рендеринг таблицы пользователей
  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Управление пользователями</CardTitle>
          <CardDescription>Просмотр, изменение ролей и блокировка пользователей.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Дата регистрации</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.uid}>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Select
                      value={u.role}
                      onValueChange={(newRole) => handleRoleChange(u.uid, newRole as UserRole)}
                      disabled={updatingUserId === u.uid || userData?.uid === u.uid} // Нельзя менять свою роль через этот интерфейс
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allRoles.map(role => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{formatTimestamp(u.createdAt)}</TableCell>
                  <TableCell>{u.isBlocked ? 'Заблокирован' : 'Активен'}</TableCell>
                  <TableCell className="text-right">
                     <div className="flex items-center justify-end space-x-2">
                        <Label htmlFor={`block-switch-${u.uid}`} className="text-sm">
                            {u.isBlocked ? 'Разблок.' : 'Заблок.'}
                        </Label>
                        <Switch
                            id={`block-switch-${u.uid}`}
                            checked={!!u.isBlocked}
                            onCheckedChange={(checked: boolean) => handleBlockChange(u.uid, checked)}
                            disabled={updatingUserId === u.uid || userData?.uid === u.uid} // Нельзя блокировать себя
                        />
                     </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
