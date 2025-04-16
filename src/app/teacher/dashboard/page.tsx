"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { getAssignedComplaints, getUserComplaints } from '@/lib/firebase/firestoreService'; // Функции для получения назначенных и своих обращений
import type { Complaint } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ComplaintsTable } from '@/components/complaints-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function TeacherDashboardPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [assignedComplaints, setAssignedComplaints] = useState<Complaint[]>([]);
  const [mySuggestions, setMySuggestions] = useState<Complaint[]>([]); // Учителя подают только предложения
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Проверка аутентификации и роли учителя
    if (!authLoading) {
      if (!user || !userData) {
        router.push('/login'); // Не вошел
        return;
      }
      if (userData.role !== 'teacher') {
        router.push('/'); // Не учитель - на главную
        return;
      }

      // Загрузка данных для учителя
      setLoadingData(true);
      setError(null);
      const fetchData = async () => {
        try {
          // Загружаем назначенные обращения
          const assigned = await getAssignedComplaints(user.uid);
          setAssignedComplaints(assigned);

          // Загружаем свои обращения (фильтруем только предложения)
          const own = await getUserComplaints(user.uid);
          setMySuggestions(own.filter(c => c.type === 'Предложение'));

        } catch (err) {
          console.error("Ошибка загрузки данных для учителя:", err);
          setError("Не удалось загрузить данные.");
        } finally {
          setLoadingData(false);
        }
      };
      fetchData();
    }
  }, [user, userData, authLoading, router]);

  if (authLoading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Загрузка панели учителя...</p>
      </div>
    );
  }

   // Проверка роли еще раз
   if (userData?.role !== 'teacher') {
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
    <div className="container mx-auto py-10 space-y-8">
      {/* Секция назначенных обращений */}
      <Card>
        <CardHeader>
          <CardTitle>Назначенные вам обращения</CardTitle>
          <CardDescription>Обращения, по которым вы назначены ответственным.</CardDescription>
        </CardHeader>
        <CardContent>
          <ComplaintsTable
            complaints={assignedComplaints}
            showApplicant={true} // Показываем заявителя
          />
        </CardContent>
      </Card>

       {/* Секция своих предложений */}
       <Card>
        <CardHeader>
          <CardTitle>Мои предложения</CardTitle>
          <CardDescription>Поданные вами предложения.</CardDescription>
        </CardHeader>
        <CardContent>
          <ComplaintsTable
            complaints={mySuggestions}
          />
        </CardContent>
      </Card>
    </div>
  );
}
