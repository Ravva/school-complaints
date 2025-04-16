"use client";

// import React, { useEffect } from 'react'; // Удаляем дубликат
// import { useAuth } from '@/context/AuthContext'; // Удаляем дубликат
// import { useRouter } from 'next/navigation'; // Удаляем дубликат
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Удаляем дубликат
import React, { useEffect, useState } from 'react'; // Оставляем этот блок
import { useAuth } from '@/context/AuthContext'; // Оставляем этот блок
import { useRouter } from 'next/navigation'; // Оставляем этот блок
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Оставляем этот блок
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Импортируем Input
import { Label } from '@/components/ui/label'; // Импортируем Label
import { Textarea } from '@/components/ui/textarea'; // Импортируем Textarea
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Импортируем Select
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // Импортируем RadioGroup
import { createComplaint } from '@/lib/firebase/firestoreService'; // Импортируем функцию создания обращения
import { storage } from '@/lib/firebase/config'; // Импортируем storage для загрузки файлов
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import type { Complaint, ComplaintCategory, AttachedFile } from '@/types'; // Импортируем типы

// Категории из ТЗ для Select
const categories: ComplaintCategory[] = [
  'Учебный процесс',
  'Инфраструктура',
  'Безопасность',
  'Внеклассная деятельность',
  'Взаимодействие',
  'Предложения по улучшению',
  'Другое',
  '', // Для варианта "Не выбрано"
];

export default function SubmitComplaintPage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  // Перенаправляем неаутентифицированных пользователей на страницу входа
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Показываем заглушку во время загрузки или если пользователь не вошел
  if (loading || !user || !userData) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <p>Загрузка...</p> {/* Можно добавить спиннер */}
        </div>
    );
  }

  // Состояние формы
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('');
  // Тип обращения: по умолчанию 'Жалоба', если пользователь - учитель, то 'Предложение'
  const [type, setType] = useState<'Жалоба' | 'Предложение'>(
    userData.role === 'teacher' ? 'Предложение' : 'Жалоба'
  );
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      // Проверка размера и количества файлов (пример: макс 5 файлов, по 5МБ каждый)
      const selectedFiles = event.target.files;
      if (selectedFiles.length > 5) {
          setFormError("Можно прикрепить не более 5 файлов.");
          setFiles(null); // Сбрасываем выбор
          return;
      }
      for (let i = 0; i < selectedFiles.length; i++) {
          if (selectedFiles[i].size > 5 * 1024 * 1024) { // 5 MB
              setFormError(`Файл "${selectedFiles[i].name}" слишком большой (макс. 5 МБ).`);
              setFiles(null); // Сбрасываем выбор
              return;
          }
      }
      setFiles(selectedFiles);
      setFormError(null); // Сбрасываем ошибку, если файлы подходят
    }
  };

  // Обработчик отправки формы
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setFormLoading(true);
    setUploadProgress(null);

    if (!user || !userData) {
      setFormError("Ошибка: пользователь не аутентифицирован.");
      setFormLoading(false);
      return;
    }

    // 1. Загрузка файлов в Firebase Storage (если есть)
    const uploadedAttachments: AttachedFile[] = [];
    if (files && files.length > 0) {
      setUploadProgress(0); // Начинаем показывать прогресс
      const uploadPromises = Array.from(files).map((file) => {
        const storageRef = ref(storage, `complaints/${user.uid}/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        return new Promise<AttachedFile>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              // Обновляем общий прогресс (упрощенно, можно сделать точнее)
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(prev => Math.max(prev ?? 0, progress)); // Показываем максимальный прогресс
            },
            (error) => {
              console.error("Ошибка загрузки файла:", error);
              reject(`Не удалось загрузить файл: ${file.name}`);
            },
            async () => {
              // Загрузка завершена, получаем URL
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve({ name: file.name, url: downloadURL });
              } catch (error) {
                 console.error("Ошибка получения URL файла:", error);
                 reject(`Не удалось получить URL для файла: ${file.name}`);
              }
            }
          );
        });
      });

      try {
        const results = await Promise.all(uploadPromises);
        uploadedAttachments.push(...results);
        setUploadProgress(100); // Успешная загрузка
      } catch (error) {
        setFormError(error as string);
        setFormLoading(false);
        setUploadProgress(null);
        return; // Прерываем отправку формы, если файлы не загрузились
      }
    }

    // 2. Создание записи в Firestore
    try {
      await createComplaint(
        user.uid,
        userData.email,
        userData.role,
        title,
        text,
        category,
        type,
        uploadedAttachments // Передаем массив загруженных файлов
      );
      // Успешно создано - очистить форму и перенаправить или показать сообщение
      setTitle('');
      setText('');
      setCategory('');
      setType(userData.role === 'teacher' ? 'Предложение' : 'Жалоба');
      setFiles(null);
      // TODO: Показать сообщение об успехе
      alert("Ваше обращение успешно подано!"); // Временное решение
      router.push('/'); // Перенаправляем на главную
    } catch (error) {
      console.error("Ошибка создания обращения:", error);
      setFormError("Не удалось подать обращение. Попробуйте позже.");
    } finally {
      setFormLoading(false);
      setUploadProgress(null);
    }
  };


  return (
    <div className="container mx-auto py-10 max-w-3xl">
       <Card>
            <CardHeader>
                <CardTitle>Подать обращение</CardTitle>
                <CardDescription>
                    Опишите вашу жалобу или предложение. Пожалуйста, будьте конструктивны.
                    {userData.role === 'teacher' && " (Учителя могут подавать только предложения)"}
                </CardDescription>
            </CardHeader>
            <CardContent>
               <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Поле Тип (Жалоба/Предложение) - только если не учитель */}
                    {userData.role !== 'teacher' && (
                        <div className="space-y-2">
                            <Label>Тип обращения</Label>
                            <RadioGroup
                                value={type}
                                onValueChange={(value) => setType(value as 'Жалоба' | 'Предложение')}
                                className="flex space-x-4"
                                disabled={formLoading}
                            >
                                <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Жалоба" id="type-complaint" />
                                <Label htmlFor="type-complaint">Жалоба</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Предложение" id="type-suggestion" />
                                <Label htmlFor="type-suggestion">Предложение</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    )}

                    {/* Поле Тема */}
                    <div className="space-y-2">
                        <Label htmlFor="title">Тема</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Кратко опишите суть проблемы или предложения"
                            required
                            disabled={formLoading}
                        />
                    </div>

                    {/* Поле Текст */}
                    <div className="space-y-2">
                        <Label htmlFor="text">Текст обращения</Label>
                        <Textarea
                            id="text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Подробно опишите ситуацию..."
                            required
                            rows={6}
                            disabled={formLoading}
                        />
                    </div>

                    {/* Поле Категория */}
                    <div className="space-y-2">
                        <Label htmlFor="category">Категория (необязательно)</Label>
                         <Select
                            value={category}
                            onValueChange={(value) => setCategory(value as ComplaintCategory)}
                            disabled={formLoading}
                        >
                            <SelectTrigger id="category">
                            <SelectValue placeholder="Выберите категорию" />
                            </SelectTrigger>
                            <SelectContent>
                            {categories.map((cat) => (
                                <SelectItem key={cat || 'none'} value={cat}>
                                {cat || 'Не выбрано'}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                    </div>

                     {/* Поле Прикрепление файлов */}
                    <div className="space-y-2">
                        <Label htmlFor="files">Прикрепить файлы (до 5 шт., макс. 5МБ каждый)</Label>
                        <Input
                            id="files"
                            type="file"
                            multiple
                            onChange={handleFileChange}
                            disabled={formLoading}
                        />
                        {/* Индикатор загрузки файлов */}
                        {uploadProgress !== null && (
                            <div className="w-full bg-muted rounded-full h-2.5 mt-2">
                                <div
                                    className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                        )}
                    </div>

                    {/* Отображение ошибок */}
                    {formError && <p className="text-sm text-destructive">{formError}</p>}

                    {/* Кнопка отправки */}
                    <Button type="submit" className="w-full" disabled={formLoading}>
                        {formLoading ? (uploadProgress !== null ? `Загрузка файлов: ${Math.round(uploadProgress)}%` : 'Отправка...') : 'Отправить обращение'}
                    </Button>
               </form>
            </CardContent>
       </Card>
    </div>
  );
}
