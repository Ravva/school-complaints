import { db } from './config'; // Наша конфигурация Firebase
import {
  doc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  updateDoc, // Добавляем updateDoc
  arrayUnion, // Добавляем arrayUnion для обновления массива
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
// Импортируем все необходимые типы, включая UserData
import type { UserRole, Complaint, ComplaintStatus, AttachedFile, StatusHistoryEntry, UserData } from '@/types';

/**
 * Сохраняет данные нового пользователя в коллекцию 'users' Firestore.
 * @param uid - Уникальный идентификатор пользователя из Firebase Auth.
 * @param email - Email пользователя.
 * @param role - Выбранная роль пользователя.
 */
export const saveUserData = async (uid: string, email: string, role: UserRole): Promise<void> => {
  const userRef = doc(db, 'users', uid); // Создаем ссылку на документ пользователя
  try {
    await setDoc(userRef, {
      uid: uid,
      email: email,
      role: role,
      createdAt: serverTimestamp(), // Используем временную метку сервера
    });
    console.log("Данные пользователя сохранены в Firestore для UID:", uid);
  } catch (error) {
    console.error("Ошибка сохранения данных пользователя в Firestore:", error);
    // Здесь можно добавить более сложную обработку ошибок, если необходимо
    throw new Error("Не удалось сохранить данные пользователя.");
  }
};

/**
 * Создает новое обращение (жалобу/предложение) в коллекции 'complaints'.
 * @param userId - UID пользователя, создающего обращение.
 * @param userEmail - Email пользователя.
 * @param userRole - Роль пользователя.
 * @param title - Тема обращения.
 * @param text - Текст обращения.
 * @param category - Категория обращения.
 * @param type - Тип обращения ('Жалоба' или 'Предложение').
 * @param attachments - Массив прикрепленных файлов.
 * @returns Promise с ID созданного документа.
 */
export const createComplaint = async (
  userId: string,
  userEmail: string,
  userRole: UserRole,
  title: string,
  text: string,
  category: Complaint['category'],
  type: Complaint['type'],
  attachments: AttachedFile[]
): Promise<string> => {
  const complaintsCollectionRef = collection(db, 'complaints');
  const now = serverTimestamp(); // Используем временную метку сервера

  // Начальная запись в истории статусов
  const initialStatusEntry: Omit<StatusHistoryEntry, 'timestamp'> & { timestamp: any } = {
      status: 'Новая',
      userId: userId, // Создатель обращения
      timestamp: now
  };

  try {
    const docRef = await addDoc(complaintsCollectionRef, {
      userId,
      userEmail,
      userRole,
      title,
      text,
      category,
      type,
      status: 'Новая' as ComplaintStatus, // Начальный статус
      createdAt: now,
      updatedAt: now,
      attachments,
      statusHistory: [initialStatusEntry], // Добавляем первую запись в историю
      assignedTo: null, // Изначально никому не назначено
      response: null,
      clarificationRequested: false,
    });
    console.log("Обращение создано с ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Ошибка создания обращения в Firestore:", error);
    throw new Error("Не удалось создать обращение.");
  }
};


/**
 * Получает список обращений для указанного пользователя.
 * @param userId - UID пользователя, чьи обращения нужно получить.
 * @returns Promise со списком обращений (Complaint[]).
 */
export const getUserComplaints = async (userId: string): Promise<Complaint[]> => {
  const complaintsCollectionRef = collection(db, 'complaints');
  // Создаем запрос: ищем документы, где поле 'userId' равно переданному userId,
  // и сортируем по дате создания (сначала новые)
  const q = query(
    complaintsCollectionRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  try {
    const querySnapshot = await getDocs(q);
    const complaints: Complaint[] = [];
    querySnapshot.forEach((doc) => {
      // Преобразуем данные документа Firestore в наш тип Complaint
      // Важно: Firestore Timestamp нужно будет корректно обработать на клиенте
      complaints.push({ id: doc.id, ...doc.data() } as Complaint);
    });
    console.log(`Получено ${complaints.length} обращений для пользователя ${userId}`);
    return complaints;
  } catch (error) {
    console.error("Ошибка получения обращений пользователя из Firestore:", error);
    throw new Error("Не удалось получить обращения пользователя.");
  }
};

/**
 * Получает список ВСЕХ обращений (для Администратора).
 * @returns Promise со списком всех обращений (Complaint[]).
 */
export const getAllComplaints = async (): Promise<Complaint[]> => {
  const complaintsCollectionRef = collection(db, 'complaints');
  // Запрос для получения всех документов, отсортированных по дате создания
  const q = query(complaintsCollectionRef, orderBy('createdAt', 'desc'));

  try {
    const querySnapshot = await getDocs(q);
    const complaints: Complaint[] = [];
    querySnapshot.forEach((doc) => {
      complaints.push({ id: doc.id, ...doc.data() } as Complaint);
    });
    console.log(`Получено ${complaints.length} всего обращений (для Администратора)`);
    return complaints;
  } catch (error) {
    console.error("Ошибка получения всех обращений из Firestore:", error);
    throw new Error("Не удалось получить все обращения.");
  }
};

/**
 * Получает список обращений, назначенных указанному учителю.
 * @param teacherId - UID учителя, чьи назначенные обращения нужно получить.
 * @returns Promise со списком назначенных обращений (Complaint[]).
 */
export const getAssignedComplaints = async (teacherId: string): Promise<Complaint[]> => {
  const complaintsCollectionRef = collection(db, 'complaints');
  // Запрос: ищем документы, где поле 'assignedTo' равно ID учителя,
  // сортируем по дате обновления (сначала недавние) или создания
  const q = query(
    complaintsCollectionRef,
    where('assignedTo', '==', teacherId),
    orderBy('updatedAt', 'desc') // Или 'createdAt'
  );

  try {
    const querySnapshot = await getDocs(q);
    const complaints: Complaint[] = [];
    querySnapshot.forEach((doc) => {
      complaints.push({ id: doc.id, ...doc.data() } as Complaint);
    });
    console.log(`Получено ${complaints.length} назначенных обращений для учителя ${teacherId}`);
    return complaints;
  } catch (error) {
    console.error("Ошибка получения назначенных обращений из Firestore:", error);
    throw new Error("Не удалось получить назначенные обращения.");
  }
};

/**
 * Обновляет статус обращения и добавляет запись в историю.
 * @param complaintId - ID обращения для обновления.
 * @param newStatus - Новый статус обращения.
 * @param updatedByUserId - UID пользователя, обновляющего статус (Админ/Учитель).
 * @param comment - Необязательный комментарий к изменению статуса.
 */
export const updateComplaintStatus = async (
  complaintId: string,
  newStatus: ComplaintStatus,
  updatedByUserId: string,
  comment?: string
): Promise<void> => {
  const complaintRef = doc(db, 'complaints', complaintId);
  const now = serverTimestamp(); // Временная метка сервера

  const statusHistoryEntry: Omit<StatusHistoryEntry, 'timestamp'> & { timestamp: any } = {
    status: newStatus,
    userId: updatedByUserId,
    timestamp: now,
    ...(comment && { comment }), // Добавляем комментарий, если он есть
  };

  try {
    await updateDoc(complaintRef, {
      status: newStatus,
      updatedAt: now,
      statusHistory: arrayUnion(statusHistoryEntry), // Добавляем новую запись в массив истории
      // Сбрасываем флаг запроса уточнения, если статус меняется с "Требует уточнения"
      ...(newStatus !== 'Требует уточнения' && { clarificationRequested: false }),
    });
    console.log(`Статус обращения ${complaintId} обновлен на "${newStatus}"`);
  } catch (error) {
    console.error("Ошибка обновления статуса обращения:", error);
    throw new Error("Не удалось обновить статус обращения.");
  }
};

/**
 * Назначает ответственного учителя для обращения и обновляет статус.
 * @param complaintId - ID обращения.
 * @param teacherId - UID учителя, которому назначается обращение.
 * @param teacherEmail - Email учителя (для удобства отображения).
 * @param adminId - UID администратора, выполняющего назначение.
 */
export const assignComplaintToTeacher = async (
  complaintId: string,
  teacherId: string,
  teacherEmail: string, // Предполагаем, что email учителя известен администратору
  adminId: string
): Promise<void> => {
  const complaintRef = doc(db, 'complaints', complaintId);
  const now = serverTimestamp();
  const newStatus: ComplaintStatus = 'Назначена ответственному';

  const statusHistoryEntry: Omit<StatusHistoryEntry, 'timestamp'> & { timestamp: any } = {
    status: newStatus,
    userId: adminId, // Действие выполняет администратор
    timestamp: now,
    comment: `Назначено учителю: ${teacherEmail}` // Добавляем комментарий о назначении
  };

  try {
    await updateDoc(complaintRef, {
      assignedTo: teacherId,
      assignedToEmail: teacherEmail,
      status: newStatus,
      updatedAt: now,
      statusHistory: arrayUnion(statusHistoryEntry),
    });
    console.log(`Обращение ${complaintId} назначено учителю ${teacherId}`);
    // TODO: Отправить email-уведомление учителю о назначении
  } catch (error) {
    console.error("Ошибка назначения ответственного:", error);
    throw new Error("Не удалось назначить ответственного.");
  }
};

/**
 * Добавляет ответ на обращение и обновляет статус на "Отвечено".
 * @param complaintId - ID обращения.
 * @param responseText - Текст ответа.
 * @param responderId - UID пользователя, дающего ответ (Админ/Учитель).
 */
export const addComplaintResponse = async (
  complaintId: string,
  responseText: string,
  responderId: string
): Promise<void> => {
  const complaintRef = doc(db, 'complaints', complaintId);
  const now = serverTimestamp();
  const newStatus: ComplaintStatus = 'Отвечено';

  const statusHistoryEntry: Omit<StatusHistoryEntry, 'timestamp'> & { timestamp: any } = {
    status: newStatus,
    userId: responderId, // Ответственный за ответ
    timestamp: now,
    comment: 'Добавлен ответ на обращение'
  };

  try {
    await updateDoc(complaintRef, {
      response: responseText,
      responseAt: now,
      responderId: responderId,
      status: newStatus,
      updatedAt: now,
      statusHistory: arrayUnion(statusHistoryEntry),
    });
    console.log(`Добавлен ответ на обращение ${complaintId}`);
    // TODO: Отправить email-уведомление пользователю о получении ответа
  } catch (error) {
    console.error("Ошибка добавления ответа на обращение:", error);
    throw new Error("Не удалось добавить ответ на обращение.");
  }
};

// --- Функции управления пользователями (для Администратора) ---

/**
 * Получает список всех пользователей из Firestore.
 * @returns Promise со списком данных пользователей (UserData[]).
 */
export const getAllUsers = async (): Promise<UserData[]> => {
    const usersCollectionRef = collection(db, 'users');
    const q = query(usersCollectionRef, orderBy('createdAt', 'desc')); // Сортируем по дате регистрации

    try {
        const querySnapshot = await getDocs(q);
        const users: UserData[] = [];
        querySnapshot.forEach((doc) => {
            // Используем ID документа как UID, если поле uid отсутствует (на всякий случай)
            const data = doc.data();
            users.push({ uid: doc.id, ...data } as UserData);
        });
        console.log(`Получено ${users.length} пользователей`);
        return users;
    } catch (error) {
        console.error("Ошибка получения списка пользователей:", error);
        throw new Error("Не удалось получить список пользователей.");
    }
};

/**
 * Обновляет роль указанного пользователя.
 * @param userId - UID пользователя для обновления.
 * @param newRole - Новая роль пользователя.
 */
export const updateUserRole = async (userId: string, newRole: UserRole): Promise<void> => {
    const userRef = doc(db, 'users', userId);
    try {
        await updateDoc(userRef, {
            role: newRole
        });
        console.log(`Роль пользователя ${userId} обновлена на "${newRole}"`);
    } catch (error) {
        console.error("Ошибка обновления роли пользователя:", error);
        throw new Error("Не удалось обновить роль пользователя.");
    }
};

/**
 * Блокирует или разблокирует пользователя (устанавливает флаг isBlocked).
 * @param userId - UID пользователя.
 * @param block - true для блокировки, false для разблокировки.
 */
export const setUserBlockedStatus = async (userId: string, block: boolean): Promise<void> => {
    const userRef = doc(db, 'users', userId);
    try {
        await updateDoc(userRef, {
            isBlocked: block
        });
        console.log(`Пользователь ${userId} ${block ? 'заблокирован' : 'разблокирован'}`);
        // TODO: Дополнительно можно отключить пользователя в Firebase Auth
        // import { getAuth } from "firebase/auth";
        // const auth = getAuth();
        // await auth.updateUser(userId, { disabled: block });
        // Это требует Admin SDK (Cloud Functions или бэкенд)
    } catch (error) {
        console.error("Ошибка изменения статуса блокировки пользователя:", error);
        throw new Error("Не удалось изменить статус блокировки пользователя.");
    }
};


// TODO: Добавить функции для обработки уточнения, управления категориями
