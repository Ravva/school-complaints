"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { getUserComplaints } from '@/lib/firebase/firestoreService';
import type { Complaint } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge"; // Для отображения статуса
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Функция для форматирования Timestamp (пример)
const formatTimestamp = (timestamp: any): string => {
  if (!timestamp || !timestamp.toDate) {
    return 'Неизвестно';
  }
  try {
    return timestamp.toDate().toLocaleString('ru-RU');
  } catch (e) {
    console.error("Error formatting timestamp:", e);
    return 'Неверная дата';
  }
};

// Функция для получения цвета Badge в зависимости от статуса
const getStatusBadgeVariant = (status: Complaint['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Новая': return 'default';
        case 'Назначена ответственному':
        case 'В работе': return 'secondary';
        case 'Отвечено': return 'outline'; // Можно использовать success, если добавить такой вариант
        case 'Отклонено': return 'destructive';
        case 'Требует уточнения': return 'default'; // Или другой цвет
        default: return 'default';
    }
};


export default function MyComplaintsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Перенаправляем, если пользователь не вошел
    if (!authLoading && !user) {
      router.push('/login');
      return; // Выходим, чтобы не выполнять загрузку данных
    }

    // Загружаем обращения, если пользователь вошел
    if (user) {
      setLoadingComplaints(true);
      setError(null);
      getUserComplaints(user.uid)
        .then(data => {
          setComplaints(data);
        })
        .catch(err => {
          console.error("Ошибка загрузки обращений:", err);
          setError("Не удалось загрузить ваши обращения.");
        })
        .finally(() => {
          setLoadingComplaints(false);
        });
    } else if (!authLoading) {
        // Если пользователь не вошел и загрузка Auth завершена
        setLoadingComplaints(false);
    }
  }, [user, authLoading, router]);

  if (authLoading || loadingComplaints) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Загрузка обращений...</p>
      </div>
    );
  }

  if (error) {
     return (
      <div className="container mx-auto py-10 text-center">
        <p className="text-destructive">{error}</p>
        <Link href="/" passHref>
            <Button variant="link" className="mt-4">Вернуться на главную</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Мои обращения</CardTitle>
          <CardDescription>Список поданных вами жалоб и предложений.</CardDescription>
        </CardHeader>
        <CardContent>
          {complaints.length === 0 ? (
            <p className="text-center text-muted-foreground">У вас пока нет поданных обращений.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата подачи</TableHead>
                  <TableHead>Тема</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complaints.map((complaint) => (
                  <TableRow key={complaint.id}>
                    <TableCell>{formatTimestamp(complaint.createdAt)}</TableCell>
                    <TableCell className="font-medium">{complaint.title}</TableCell>
                    <TableCell>{complaint.type}</TableCell>
                    <TableCell>
                        <Badge variant={getStatusBadgeVariant(complaint.status)}>
                            {complaint.status}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {/* TODO: Ссылка на страницу детального просмотра */}
                      <Link href={`/complaints/${complaint.id}`} passHref>
                         <Button variant="outline" size="sm">Просмотр</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
