"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config'; // Импортируем auth и db
import type { UserData } from '@/types'; // Импортируем тип UserData

// Определяем тип для значения контекста
interface AuthContextType {
  user: User | null; // Пользователь Firebase Auth
  userData: UserData | null; // Данные пользователя из Firestore
  loading: boolean; // Состояние загрузки
}

// Создаем контекст с начальным значением null
const AuthContext = createContext<AuthContextType | null>(null);

// Создаем провайдер контекста
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true); // Изначально загрузка активна

  useEffect(() => {
    // Слушатель изменения состояния аутентификации Firebase
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser); // Устанавливаем пользователя Firebase Auth
      if (currentUser) {
        // Если пользователь вошел, пытаемся загрузить его данные из Firestore
        const userDocRef = doc(db, 'users', currentUser.uid);
        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            setUserData(docSnap.data() as UserData); // Сохраняем данные пользователя
          } else {
            console.warn("Документ пользователя не найден в Firestore для UID:", currentUser.uid);
            setUserData(null); // Пользователь есть в Auth, но нет данных в Firestore
          }
        } catch (error) {
          console.error("Ошибка загрузки данных пользователя из Firestore:", error);
          setUserData(null);
        }
      } else {
        // Если пользователь вышел, сбрасываем данные
        setUserData(null);
      }
      setLoading(false); // Загрузка завершена
    });

    // Отписываемся от слушателя при размонтировании компонента
    return () => unsubscribe();
  }, []); // Пустой массив зависимостей гарантирует выполнение эффекта один раз

  // Предоставляем значение контекста дочерним компонентам
  return (
    <AuthContext.Provider value={{ user, userData, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Хук для удобного использования контекста
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === null) {
    // Эта ошибка возникает, если хук используется вне AuthProvider
    throw new Error("useAuth должен использоваться внутри AuthProvider");
  }
  return context;
};
