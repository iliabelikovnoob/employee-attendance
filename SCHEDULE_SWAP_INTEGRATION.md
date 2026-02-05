# Инструкция по финальной интеграции "Обмен графиками"

## ✅ Что уже сделано:

1. ✅ Добавлена модель `ScheduleSwapRequest` в Prisma schema
2. ✅ Создан API `/api/schedule-swap` (GET, POST)
3. ✅ Создан API `/api/schedule-swap/[id]` (PUT, DELETE)
4. ✅ Создана модалка `ScheduleSwapModal.tsx`
5. ✅ Добавлена кнопка "Обменяться" в `DayDetailsModalEnhanced.tsx`
6. ✅ Добавлен статус WEEKEND

---

## 📋 Осталось сделать:

### 1. Применить миграцию Prisma:

```bash
npx prisma migrate dev --name add_schedule_swap
npx prisma generate
```

### 2. Добавить запросы на обмен в централизованную страницу "Запросы"

В файле `/app/(dashboard)/requests/page.tsx`:

#### A. Добавить тип:
```typescript
type RequestType = 'all' | 'attendance' | 'vacation' | 'overtime' | 'swap';
```

#### B. Добавить интерфейс:
```typescript
interface SwapRequest {
  id: string;
  requesterId: string;
  targetUserId: string;
  date: string;
  requesterOldStatus: string;
  requesterNewStatus: string;
  targetOldStatus: string;
  targetNewStatus: string;
  reason?: string;
  status: string;
  targetApproved: boolean;
  requester: { name: string; position?: string };
  targetUser: { name: string; position?: string };
}
```

#### C. Добавить состояние:
```typescript
const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
```

#### D. Загружать в `fetchAllRequests`:
```typescript
// Fetch swap requests
const swapRes = await fetch('/api/schedule-swap?status=PENDING');
if (swapRes.ok) {
  const data = await swapRes.json();
  setSwapRequests(data);
}
```

#### E. Добавить в totalPending:
```typescript
const totalPending = 
  attendanceRequests.length + 
  vacationRequests.length + 
  overtimeRequests.length +
  swapRequests.length;
```

#### F. Добавить вкладку:
```typescript
<button
  onClick={() => setActiveTab('swap')}
  className={...}
>
  <IoSwapHorizontal /> Обмены ({swapRequests.length})
</button>
```

#### G. Добавить обработчик:
```typescript
const handleSwapAction = async (id: string, action: 'target-approve' | 'admin-approve' | 'reject') => {
  try {
    const response = await fetch(`/api/schedule-swap/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });

    if (!response.ok) throw new Error();

    toast.success(
      action === 'admin-approve' ? 'Обмен подтвержден' :
      action === 'target-approve' ? 'Вы одобрили обмен' :
      'Обмен отклонен'
    );
    fetchAllRequests();
  } catch (error) {
    toast.error('Ошибка обработки обмена');
  }
};
```

#### H. Добавить рендеринг карточек обмена:
```typescript
{filtered.swap.map((req) => (
  <div key={`swap-${req.id}`} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <IoSwapHorizontal className="text-purple-600 w-5 h-5" />
          <span className="font-semibold text-lg text-gray-900 dark:text-white">
            Обмен графиками
          </span>
        </div>
        <div className="space-y-2">
          <div>
            <span className="font-medium">{req.requester.name}</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {' '}• {StatusLabels[req.requesterOldStatus]} → {StatusLabels[req.requesterNewStatus]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">⇄</span>
          </div>
          <div>
            <span className="font-medium">{req.targetUser.name}</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {' '}• {StatusLabels[req.targetOldStatus]} → {StatusLabels[req.targetNewStatus]}
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          {format(new Date(req.date), 'd MMMM yyyy', { locale: ru })}
        </p>
        {req.reason && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
            Причина: {req.reason}
          </p>
        )}
        {!req.targetApproved && (
          <div className="mt-2 text-sm text-orange-600 dark:text-orange-400">
            ⏳ Ожидается подтверждение второго сотрудника
          </div>
        )}
      </div>
      <div className="flex gap-2 ml-4">
        {session?.user?.role === 'ADMIN' && req.targetApproved && (
          <Button
            onClick={() => handleSwapAction(req.id, 'admin-approve')}
            className="bg-green-600 hover:bg-green-700"
          >
            <IoCheckmark className="w-5 h-5" />
            Подтвердить
          </Button>
        )}
        {session?.user?.id === req.targetUserId && !req.targetApproved && (
          <Button
            onClick={() => handleSwapAction(req.id, 'target-approve')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <IoCheckmark className="w-5 h-5" />
            Одобрить обмен
          </Button>
        )}
        <Button
          onClick={() => handleSwapAction(req.id, 'reject')}
          variant="secondary"
          className="hover:bg-red-100 dark:hover:bg-red-900/20"
        >
          <IoClose className="w-5 h-5 text-red-600" />
        </Button>
      </div>
    </div>
  </div>
))}
```

### 3. Обновить счетчик в Header:

В `/components/Header.tsx` добавить загрузку swap requests:

```typescript
// Schedule swap requests
const swapRes = await fetch('/api/schedule-swap?status=PENDING');
if (swapRes.ok) {
  const data = await swapRes.json();
  total += Array.isArray(data) ? data.length : 0;
}
```

---

## 🚀 Запуск:

```bash
npx prisma migrate dev --name add_schedule_swap
npx prisma generate
rm -rf .next
npm run dev
```

---

## 🎯 Процесс обмена:

1. **Сотрудник А** открывает день, нажимает "Обменяться"
2. Выбирает **Сотрудника Б** и желаемый статус
3. Отправляет запрос
4. **Сотрудник Б** видит запрос в разделе "Запросы" → "Обмены"
5. Одобряет или отклоняет
6. Если одобрил → запрос идет к **Админу**
7. **Админ** подтверждает → статусы автоматически меняются

---

## 📊 Итоговый функционал:

✅ Статус WEEKEND добавлен (6 статусов теперь)
✅ Запросы на изменение статуса (уже работали)
✅ Обмен графиками между сотрудниками (NEW!)
✅ Централизованная система запросов
✅ Двухэтапное подтверждение обмена

---

Готово! После выполнения этих шагов функционал обмена графиками будет полностью интегрирован! 🎉
