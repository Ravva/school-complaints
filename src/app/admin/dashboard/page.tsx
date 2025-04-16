"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { getAllComplaints } from '@/lib/firebase/firestoreService'; // Функция для получения ВСЕХ обращений
import type { Complaint } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ComplaintsTable } from '@/components/complaints-table'; // Импортируем таблицу
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Проверка аутентификации и роли администратора
    if (!authLoading) {
      if (!user || !userData) {
        router.push('/login'); // Не вошел
        return;
      }
      if (userData.role !== 'admin') {
        router.push('/'); // Не админ - на главную
        return;
      }

      // Загрузка всех обращений
      setLoadingData(true);
      setError(null);
      getAllComplaints()
        .then(data => {
          setComplaints(data);
        })
        .catch(err => {
          console.error("Ошибка загрузки всех обращений:", err);
          setError("Не удалось загрузить обращения.");
        })
        .finally(() => {
          setLoadingData(false);
        });
    }
  }, [user, userData, authLoading, router]);

  if (authLoading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Загрузка панели администратора...</p>
      </div>
    );
  }

   // Проверка роли еще раз на случай, если useEffect не успел отработать редирект
   if (userData?.role !== 'admin') {
     return (
        <div className="container mx-auto py-10 text-center">
            <p className="text-destructive">Доступ запрещен.</p>
            <Link href="/" passHref><Button variant="link" className="mt-4">Вернуться на главную</Button></Link>
        </div>
     );
   }

  if (error) {
     return (
      <div className="container mx-auto py-10 text-center">
        <p className="text-destructive">{error}</p>
         <Link href="/" passHref><Button variant="link" className="mt-4">Вернуться на главную</Button></Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
             <div>
                <CardTitle>Панель администратора</CardTitle>
                <CardDescription>Просмотр и управление всеми обращениями.</CardDescription>
             </div>
             <Link href="/admin/users" passHref>
                <Button variant="outline">Управление пользователями</Button>
             </Link>
          </div>
        </CardHeader>
        <CardContent>
          <ComplaintsTable
            complaints={complaints}
            showApplicant={true} // Показываем заявителя
            showAssignee={true}  // Показываем назначенного
          />
        </CardContent>
      </Card>
    </div>
  );
}
