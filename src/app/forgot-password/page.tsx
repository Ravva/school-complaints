"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from '@/lib/firebase/config'; // Импортируем auth
import { sendPasswordResetEmail } from 'firebase/auth'; // Импортируем функцию сброса пароля

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null); // Для сообщений успеха/ошибки
  const [loading, setLoading] = useState(false);

  const handlePasswordReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Письмо для сброса пароля отправлено на ваш email. Пожалуйста, проверьте почту.");
      setEmail(''); // Очищаем поле после отправки
    } catch (error: any) {
      console.error("Ошибка сброса пароля:", error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
        setMessage("Пользователь с таким email не найден.");
      } else {
        setMessage("Произошла ошибка при отправке письма. Попробуйте позже.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Восстановление пароля</CardTitle>
          <CardDescription>Введите ваш email, чтобы получить ссылку для сброса пароля.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            {message && <p className={`text-sm ${message.includes('ошибка') || message.includes('не найден') ? 'text-destructive' : 'text-muted-foreground'}`}>{message}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Отправка...' : 'Отправить ссылку'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
          <Link href="/login" passHref>
            <Button variant="link" className="p-0 h-auto">Вернуться ко входу</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
