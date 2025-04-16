import type { Metadata } from "next";
import { Inter as FontSans } from "next/font/google"; // Используем Inter как основной шрифт (стандарт для shadcn)
import "./globals.css";
import { cn } from "@/lib/utils"; // Утилита для объединения классов
import { ThemeProvider } from "@/components/theme-provider"; // Импортируем провайдер темы
import { AuthProvider } from "@/context/AuthContext"; // Импортируем провайдер аутентификации

// Настройка шрифта
const fontSans = FontSans({
  subsets: ["latin", "cyrillic"], // Добавляем кириллицу
  variable: "--font-sans",
});

// Обновляем метаданные
export const metadata: Metadata = {
  title: "Школьная книга жалоб и предложений",
  description: "Платформа для подачи и отслеживания школьных жалоб и предложений",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Устанавливаем язык и подавляем hydration warning для тем
    <html lang="ru" suppressHydrationWarning>
      <head />
      <body
        // Применяем классы: основной шрифт, минимальная высота экрана, цвет фона, сглаживание
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        {/* Оборачиваем приложение в ThemeProvider */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Оборачиваем в AuthProvider */}
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
