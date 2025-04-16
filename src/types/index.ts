import { Timestamp } from 'firebase/firestore';

// Роли пользователей (английские алиасы для кода и БД)
export type UserRole = 'student' | 'parent' | 'teacher' | 'admin';

// Статусы обращений согласно ТЗ
export type ComplaintStatus =
  | 'Новая'
  | 'Назначена ответственному'
  | 'В работе'
  | 'Требует уточнения'
  | 'Отвечено'
  | 'Отклонено';

// Категории обращений (примерный список из ТЗ)
export type ComplaintCategory =
  | 'Учебный процесс'
  | 'Инфраструктура'
  | 'Безопасность'
  | 'Внеклассная деятельность'
  | 'Взаимодействие'
  | 'Предложения по улучшению'
  | 'Другое'
  | ''; // Пустая строка для случая, когда категория не выбрана

// Интерфейс для данных пользователя (хранится в Firestore)
export interface UserData {
  uid: string; // Соответствует Firebase Auth UID
  email: string;
  role: UserRole;
  createdAt: Timestamp; // Дата создания аккаунта
  isBlocked?: boolean; // Флаг блокировки пользователя (true - заблокирован)
  // Можно добавить другие поля, например, имя, класс и т.д.
}

// Интерфейс для прикрепленного файла
export interface AttachedFile {
  name: string; // Имя файла
  url: string; // URL файла в Firebase Storage
  // Можно добавить тип файла, размер и т.д.
}

// Интерфейс для записи истории статусов
export interface StatusHistoryEntry {
    status: ComplaintStatus;
    timestamp: Timestamp;
    userId: string; // UID пользователя, изменившего статус (Администратор/Учитель)
    comment?: string; // Комментарий при изменении статуса (например, причина отклонения)
}

// Интерфейс для обращения (жалобы/предложения)
export interface Complaint {
  id: string; // ID документа в Firestore
  userId: string; // UID пользователя, подавшего обращение
  userEmail: string; // Email пользователя для удобства
  userRole: UserRole; // Роль пользователя на момент подачи
  title: string; // Тема
  text: string; // Текст обращения
  category: ComplaintCategory; // Категория (может быть пустой)
  type: 'Жалоба' | 'Предложение'; // Тип обращения (определяется ролью или выбором)
  status: ComplaintStatus; // Текущий статус
  createdAt: Timestamp; // Дата создания
  updatedAt: Timestamp; // Дата последнего обновления статуса/ответа
  assignedTo?: string; // UID ответственного учителя (если назначен)
  assignedToEmail?: string; // Email ответственного для удобства
  response?: string; // Ответ на обращение
  responseAt?: Timestamp; // Дата ответа
  responderId?: string; // UID ответившего (Администратор/Учитель)
  attachments: AttachedFile[]; // Массив прикрепленных файлов
  statusHistory: StatusHistoryEntry[]; // История изменения статусов
  clarificationRequested?: boolean; // Флаг, что требуется уточнение
  clarificationQuestion?: string; // Текст уточняющего вопроса
  clarificationResponse?: string; // Ответ пользователя на уточнение
}
