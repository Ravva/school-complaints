"use client";

import React from 'react';
import type { Complaint } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Функции форматирования и получения варианта Badge (можно вынести в utils)
const formatTimestamp = (timestamp: any): string => {
  if (!timestamp || !timestamp.toDate) return 'Неизвестно';
  try { return timestamp.toDate().toLocaleString('ru-RU'); }
  catch (e) { console.error("Error formatting timestamp:", e); return 'Неверная дата'; }
};
const getStatusBadgeVariant = (status: Complaint['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Новая': return 'default';
        case 'Назначена ответственному': case 'В работе': return 'secondary';
        case 'Отвечено': return 'outline';
        case 'Отклонено': return 'destructive';
        case 'Требует уточнения': return 'default';
        default: return 'default';
    }
};

interface ComplaintsTableProps {
  complaints: Complaint[];
  showAssignee?: boolean; // Показывать ли колонку "Назначено" (для Админа)
  showApplicant?: boolean; // Показывать ли колонку "Заявитель" (для Админа/Учителя)
}

export function ComplaintsTable({
  complaints,
  showAssignee = false,
  showApplicant = false,
}: ComplaintsTableProps) {

  if (complaints.length === 0) {
    return <p className="text-center text-muted-foreground py-4">Нет обращений для отображения.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Дата подачи</TableHead>
          {showApplicant && <TableHead>Заявитель</TableHead>}
          <TableHead>Тема</TableHead>
          <TableHead>Тип</TableHead>
          {showAssignee && <TableHead>Назначено</TableHead>}
          <TableHead>Статус</TableHead>
          <TableHead className="text-right">Действия</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {complaints.map((complaint) => (
          <TableRow key={complaint.id}>
            <TableCell>{formatTimestamp(complaint.createdAt)}</TableCell>
            {showApplicant && <TableCell>{complaint.userEmail}</TableCell>}
            <TableCell className="font-medium">{complaint.title}</TableCell>
            <TableCell>{complaint.type}</TableCell>
            {showAssignee && <TableCell>{complaint.assignedToEmail || '-'}</TableCell>}
            <TableCell>
              <Badge variant={getStatusBadgeVariant(complaint.status)}>
                {complaint.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Link href={`/complaints/${complaint.id}`} passHref>
                <Button variant="outline" size="sm">Просмотр</Button>
              </Link>
              {/* TODO: Добавить кнопки действий (взять в работу, ответить и т.д.) в зависимости от роли и статуса */}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
