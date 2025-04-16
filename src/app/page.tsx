"use client"; // Делаем компонент клиентским для использования хуков

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext'; // Импортируем хук аутентификации
import { Button } from '@/components/ui/button'; // Импортируем кнопку
import { auth } from '@/lib/firebase/config'; // Импортируем auth для signOut

export default function Home() {
  const { user, userData, loading } = useAuth(); // Получаем состояние аутентификации

  // Отображаем состояние загрузки
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          Школьная книга жалоб и предложений
        </h1>

        {user && userData ? (
          // Содержимое для аутентифицированных пользователей
          <div>
            <p className="mb-6 text-lg">
              Добро пожаловать, {userData.email}! (Роль: {userData.role})
            </p>
            <div className="space-x-4">
              <Link href="/submit-complaint" passHref>
                <Button>Подать обращение</Button>
              </Link>
              {/* TODO: Добавить ссылку на просмотр своих обращений */}
              <Link href="/my-complaints" passHref>
                 <Button variant="outline">Мои обращения</Button>
              </Link>
              {/* TODO: Добавить ссылки для админа/учителя */}
              {userData.role === 'admin' && (
                 <Link href="/admin/dashboard" passHref>
                    <Button variant="secondary">Панель администратора</Button>
                 </Link>
              )}
               {userData.role === 'teacher' && (
                 <Link href="/teacher/dashboard" passHref>
                    <Button variant="secondary">Панель учителя</Button>
                 </Link>
              )}
               {/* TODO: Добавить кнопку выхода */}
               <Button variant="ghost" onClick={() => auth.signOut()}>Выйти</Button>
            </div>
          </div>
        ) : (
          // Содержимое для неаутентифицированных пользователей
          <div>
            <p className="mb-6 text-lg">
              Войдите или зарегистрируйтесь, чтобы подать жалобу или предложение.
            </p>
            <div className="space-x-4">
              <Link href="/login" passHref>
                <Button>Войти</Button>
              </Link>
              <Link href="/signup" passHref>
                <Button variant="outline">Зарегистрироваться</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
