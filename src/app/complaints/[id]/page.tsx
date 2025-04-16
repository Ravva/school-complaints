"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Complaint, StatusHistoryEntry } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Функции форматирования и получения варианта Badge (можно вынести в utils)
const formatTimestamp = (timestamp: any): string => {
  if (!timestamp || !timestamp.toDate) return 'Неизвестно';
  try { return timestamp.toDate().toLocaleString('ru-RU'); }
  catch (e) { console.error("Error formatting timestamp:", e); return 'Неверная дата'; }
};
const getStatusBadgeVariant = (status: Complaint['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) { /* ... (логика как в my-complaints) ... */
        case 'Новая': return 'default';
        case 'Назначена ответственному': case 'В работе': return 'secondary';
        case 'Отвечено': return 'outline';
        case 'Отклонено': return 'destructive';
        case 'Требует уточнения': return 'default';
        default: return 'default';
    }
};

export default function ComplaintDetailPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const complaintId = params?.id as string; // Получаем ID из URL

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loadingComplaint, setLoadingComplaint] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canView, setCanView] = useState(false); // Флаг, может ли текущий пользователь просматривать

  useEffect(() => {
    // Перенаправляем неаутентифицированных
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && complaintId) {
      setLoadingComplaint(true);
      setError(null);
      const complaintRef = doc(db, 'complaints', complaintId);

      getDoc(complaintRef)
        .then((docSnap) => {
          if (docSnap.exists()) {
            const data = { id: docSnap.id, ...docSnap.data() } as Complaint;
            setComplaint(data);

            // Проверка прав доступа на просмотр
            if (userData) {
                const isOwner = data.userId === user.uid;
                const isAdmin = userData.role === 'admin';
                const isAssignedTeacher = userData.role === 'teacher' && data.assignedTo === user.uid;
                if (isOwner || isAdmin || isAssignedTeacher) {
                    setCanView(true);
                } else {
                    setError("У вас нет прав для просмотра этого обращения.");
                    setCanView(false);
                }
            } else if (!authLoading) {
                 setError("Не удалось проверить права доступа.");
                 setCanView(false);
            }

          } else {
            setError("Обращение не найдено.");
            setComplaint(null);
            setCanView(false);
          }
        })
        .catch((err) => {
          console.error("Ошибка загрузки обращения:", err);
          setError("Не удалось загрузить данные обращения.");
          setComplaint(null);
          setCanView(false);
        })
        .finally(() => {
          setLoadingComplaint(false);
        });
    } else if (!complaintId) {
        setError("Не указан ID обращения.");
        setLoadingComplaint(false);
        setCanView(false);
    }

  }, [user, userData, authLoading, complaintId, router]);

  // Обработка состояний загрузки и ошибок
  if (authLoading || loadingComplaint) {
    return <div className="flex items-center justify-center min-h-screen"><p>Загрузка данных обращения...</p></div>;
  }

  if (error || !canView) {
    return (
      <div className="container mx-auto py-10 text-center">
        <p className="text-destructive">{error || "Доступ запрещен."}</p>
        <Link href="/" passHref><Button variant="link" className="mt-4">Вернуться на главную</Button></Link>
      </div>
    );
  }

  if (!complaint) {
     // Это состояние не должно достигаться при canView=true, но на всякий случай
     return <div className="container mx-auto py-10 text-center"><p>Обращение не найдено.</p></div>;
  }

  // Отображение деталей обращения
  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
                <CardTitle className="mb-1">{complaint.title}</CardTitle>
                <CardDescription>
                    Подано: {formatTimestamp(complaint.createdAt)} | Тип: {complaint.type}
                    {complaint.category && ` | Категория: ${complaint.category}`}
                </CardDescription>
            </div>
            <Badge variant={getStatusBadgeVariant(complaint.status)} className="text-sm">
                {complaint.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Текст обращения */}
          <section>
            <h3 className="font-semibold mb-2 text-lg">Текст обращения:</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">{complaint.text}</p>
          </section>

          {/* Прикрепленные файлы */}
          {complaint.attachments && complaint.attachments.length > 0 && (
            <section>
              <h3 className="font-semibold mb-2 text-lg">Прикрепленные файлы:</h3>
              <ul className="list-disc list-inside space-y-1">
                {complaint.attachments.map((file, index) => (
                  <li key={index}>
                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {file.name}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Ответ на обращение */}
          {complaint.response && (
             <section className="border-t pt-4">
                <h3 className="font-semibold mb-2 text-lg">Ответ:</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{complaint.response}</p>
                <p className="text-xs text-gray-500 mt-2">
                    Ответил: {complaint.responderId} ({/* TODO: Получить email по ID */} ) | Дата: {formatTimestamp(complaint.responseAt)}
                </p>
             </section>
          )}

           {/* История статусов */}
           {complaint.statusHistory && complaint.statusHistory.length > 0 && (
             <section className="border-t pt-4">
                <h3 className="font-semibold mb-2 text-lg">История статусов:</h3>
                <ul className="space-y-2 text-sm">
                    {complaint.statusHistory.slice().reverse().map((entry, index) => ( // Показываем с последнего
                        <li key={index} className="border-l-2 pl-3 pb-1 border-dashed">
                            <span className={`font-medium ${entry.status === 'Отклонено' ? 'text-destructive' : ''}`}>
                                {entry.status}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                                ({formatTimestamp(entry.timestamp)} - {entry.userId /* TODO: Получить email */})
                            </span>
                            {entry.comment && <p className="text-xs text-gray-600 italic mt-0.5">"{entry.comment}"</p>}
                        </li>
                    ))}
                </ul>
             </section>
           )}

           {/* TODO: Добавить блок действий для Админа/Учителя (смена статуса, назначение, ответ) */}

           <div className="border-t pt-4 text-right">
                <Link href="/my-complaints" passHref>
                    <Button variant="outline">Назад к списку</Button>
                </Link>
           </div>

        </CardContent>
      </Card>
    </div>
  );
}
