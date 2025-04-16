"use client";

"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Импортируем useRouter для редиректа
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
// Импортируем функции Firebase Auth и конфигурацию
import { auth } from '@/lib/firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Проверяем, подтвержден ли email
      if (!user.emailVerified) {
        setError("Пожалуйста, подтвердите ваш email перед входом. Проверьте почту.");
        // Опционально: можно добавить кнопку для повторной отправки письма
        // await sendEmailVerification(user); // Если нужно повторно отправить
        setLoading(false);
        return; // Прерываем вход, если email не подтвержден
      }

      // Успешный вход - редирект на главную страницу (или другую защищенную страницу)
      router.push('/'); // Редирект на главную

    } catch (error: any) {
      console.error("Ошибка входа:", error);
      // Обработка стандартных ошибок Firebase Auth
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
         setError("Неверный email или пароль.");
      } else if (error.code === 'auth/too-many-requests') {
         setError("Слишком много попыток входа. Попробуйте позже.");
      }
       else {
        setError("Произошла ошибка при входе. Попробуйте позже.");
      }
    } finally {
      setLoading(false);
    }
  };

  const router = useRouter(); // Инициализируем роутер

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Вход</CardTitle>
          <CardDescription>Войдите в свой аккаунт</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
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
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="flex items-center justify-end"> {/* Контейнер для ссылки */}
              <Link href="/forgot-password" passHref>
                <Button variant="link" className="p-0 h-auto text-sm">Забыли пароль?</Button>
              </Link>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Вход...' : 'Войти'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
          Нет аккаунта?
          <Link href="/signup" passHref>
            <Button variant="link" className="p-0 ml-1 h-auto">Зарегистрироваться</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
