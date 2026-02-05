# Добавление вкладки "Обмены" в админку (страница Запросы)

## Файл: `/app/(dashboard)/requests/page.tsx`

### 1. Добавить тип запроса:

```typescript
type RequestType = 'all' | 'attendance' | 'vacation' | 'overtime' | 'swap';
```

### 2. Добавить интерфейс (после OvertimeRequest):

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
  requester: {
    name: string;
    position?: string;
  };
  targetUser: {
    name: string;
    position?: string;
  };
}
```

### 3. Добавить состояние:

```typescript
const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
```

### 4. В `fetchAllRequests` добавить загрузку:

```typescript
// Fetch swap requests
const swapRes = await fetch('/api/schedule-swap?status=PENDING');
if (swapRes.ok) {
  const data = await swapRes.json();
  setSwapRequests(Array.isArray(data) ? data : []);
}
```

### 5. Обновить totalPending:

```typescript
const totalPending = 
  attendanceRequests.length + 
  vacationRequests.length + 
  overtimeRequests.length +
  swapRequests.length;
```

### 6. Добавить в getFilteredRequests:

```typescript
case 'swap':
  return { attendance: [], vacation: [], overtime: [], swap: swapRequests };
default:
  return {
    attendance: attendanceRequests,
    vacation: vacationRequests,
    overtime: overtimeRequests,
    swap: swapRequests,
  };
```

### 7. Добавить вкладку (после вкладки "Изменения"):

```typescript
<button
  onClick={() => setActiveTab('swap')}
  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
    activeTab === 'swap'
      ? 'bg-blue-600 text-white'
      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
  }`}
>
  <IoSwapHorizontal /> Обмены ({swapRequests.length})
</button>
```

### 8. Добавить обработчик:

```typescript
const handleSwapAction = async (id: string, action: 'admin-approve' | 'reject') => {
  try {
    const response = await fetch(`/api/schedule-swap/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });

    if (!response.ok) throw new Error();

    toast.success(action === 'admin-approve' ? 'Обмен подтвержден и применен' : 'Обмен отклонен');
    fetchAllRequests();
  } catch (error) {
    toast.error('Ошибка обработки обмена');
  }
};
```

### 9. Добавить рендеринг карточек (после Overtime Requests):

```typescript
{/* Swap Requests */}
{filtered.swap?.map((req: SwapRequest) => (
  <div
    key={`swap-${req.id}`}
    className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-l-4 border-purple-500"
  >
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <IoSwapHorizontal className="text-purple-600 w-5 h-5" />
          <span className="font-semibold text-lg text-gray-900 dark:text-white">
            Обмен графиками
          </span>
        </div>
        
        {/* Детали обмена */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{req.requester.name}</span>
            <span className="text-gray-600 dark:text-gray-400">
              {StatusEmojis[req.requesterOldStatus as keyof typeof StatusEmojis]}{' '}
              {StatusLabels[req.requesterOldStatus as keyof typeof StatusLabels]}
            </span>
            <span className="text-gray-400">→</span>
            <span className="text-blue-600 dark:text-blue-400">
              {StatusEmojis[req.requesterNewStatus as keyof typeof StatusEmojis]}{' '}
              {StatusLabels[req.requesterNewStatus as keyof typeof StatusLabels]}
            </span>
          </div>
          
          <div className="flex items-center justify-center">
            <span className="text-2xl text-purple-600">⇄</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{req.targetUser.name}</span>
            <span className="text-gray-600 dark:text-gray-400">
              {StatusEmojis[req.targetOldStatus as keyof typeof StatusEmojis]}{' '}
              {StatusLabels[req.targetOldStatus as keyof typeof StatusLabels]}
            </span>
            <span className="text-gray-400">→</span>
            <span className="text-blue-600 dark:text-blue-400">
              {StatusEmojis[req.targetNewStatus as keyof typeof StatusEmojis]}{' '}
              {StatusLabels[req.targetNewStatus as keyof typeof StatusLabels]}
            </span>
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          {format(new Date(req.date), 'd MMMM yyyy', { locale: ru })}
        </p>
        
        {req.reason && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 italic">
            Причина: {req.reason}
          </p>
        )}
        
        {/* Статус одобрения */}
        {req.targetApproved ? (
          <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
            ✓ Партнер одобрил обмен
          </div>
        ) : (
          <div className="text-sm text-orange-600 dark:text-orange-400">
            ⏳ Ожидается одобрение партнера
          </div>
        )}
      </div>
      
      {/* Кнопки */}
      <div className="flex gap-2 ml-4">
        {req.targetApproved && (
          <Button
            onClick={() => handleSwapAction(req.id, 'admin-approve')}
            className="bg-green-600 hover:bg-green-700"
          >
            <IoCheckmark className="w-5 h-5" />
            Подтвердить
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

### 10. Обновить Header для подсчета:

В `/components/Header.tsx` в `fetchPendingCount` добавить:

```typescript
// Schedule swap requests
const swapRes = await fetch('/api/schedule-swap?status=PENDING');
if (swapRes.ok) {
  const data = await swapRes.json();
  // Считаем только те, где партнер одобрил
  const approved = data.filter((req: any) => req.targetApproved);
  total += approved.length;
}
```

---

После этих изменений админ будет видеть запросы на обмен во вкладке "Обмены"!
