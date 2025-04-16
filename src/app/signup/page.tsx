"use client"; // Компонент будет интерактивным

"use client"; // Компонент будет интерактивным

import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; // Импортируем useRouter для редиректа
import Link from 'next/link'; // Импортируем Link для навигации
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Импортируем функции Firebase Auth и конфигурацию
import { auth } from '@/lib/firebase/config';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
// Импортируем функцию сохранения данных пользователя
import { saveUserData } from '@/lib/firebase/firestoreService';
import type { UserRole } from '@/types'; // Импортируем обновленный тип UserRole

// Определяем возможные роли для регистрации (согласно ТЗ и новым алиасам)
const registrationRoles: Exclude<UserRole, 'admin'>[] = ['student', 'parent', 'teacher'];

// Маппинг алиасов на русские названия для отображения в UI
const roleDisplayNames: Record<Exclude<UserRole, 'admin'>, string> = {
  student: 'Ученик',
  parent: 'Родитель',
  teacher: 'Учитель',
};

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<Exclude<UserRole, 'admin'> | ''>(''); // Используем Exclude<'admin'>
  const [error, setError] = useState<string | null>(null); // Для отображения ошибок
  const [loading, setLoading] = useState(false); // Для индикации загрузки

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null); // Сбрасываем ошибки перед новой попыткой

    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }
    if (!role) {
      setError("Пожалуйста, выберите роль");
      return;
    }

    setLoading(true);
    try {
      // 1. Создаем пользователя в Firebase Auth
      // 1. Создаем пользователя в Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Сохраняем данные пользователя (включая роль) в Firestore
      await saveUserData(user.uid, user.email!, role); // Используем ! т.к. email обязателен при регистрации

      // 3. Отправить письмо для подтверждения email
      await sendEmailVerification(user);
      // Устанавливаем сообщение об успехе (можно использовать другой state, если нужно отличать от ошибок)
      setError("Письмо с подтверждением отправлено на ваш email. Пожалуйста, проверьте почту и войдите в систему.");

      // Очищаем форму после успешной регистрации
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setRole('');

      // Опционально: редирект на страницу входа или специальную страницу "Проверьте email" через пару секунд
      // setTimeout(() => router.push('/login'), 3000);

    } catch (error: any) {
      // Обработка ошибок Firebase Auth
      console.error("Ошибка регистрации:", error);
      if (error.code === 'auth/email-already-in-use') {
        setError("Этот email уже зарегистрирован.");
      } else if (error.code === 'auth/weak-password') {
        setError("Пароль слишком слабый. Используйте не менее 6 символов.");
      } else {
        setError("Произошла ошибка при регистрации. Попробуйте позже.");
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
          <CardTitle className="text-2xl">Регистрация</CardTitle>
          <CardDescription>Создайте новый аккаунт</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
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
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Подтвердите пароль</Label>
              <Input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Роль</Label>
              <Select
                value={role}
                // Используем более точное приведение типа, исключая 'admin'
                onValueChange={(value) => setRole(value as Exclude<UserRole, 'admin'>)}
                required
                disabled={loading}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Выберите вашу роль" />
                </SelectTrigger>
                <SelectContent>
                  {registrationRoles.map((roleValue) => (
                    <SelectItem key={roleValue} value={roleValue}>
                      {roleDisplayNames[roleValue]} {/* Отображаем русское название */}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
          Уже есть аккаунт?
          <Link href="/login" passHref>
             <Button variant="link" className="p-0 ml-1 h-auto">Войти</Button> {/* Добавлен h-auto для выравнивания */}
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
