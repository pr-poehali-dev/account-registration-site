import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { api, RegistrationTask } from '@/lib/api';

export const RegistrationTab = () => {
  const [tasks, setTasks] = useState<RegistrationTask[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const data = await api.registration.getTasks();
      setTasks(data);
    } catch (error) {
      toast({
        title: 'Ошибка загрузки',
        description: 'Не удалось загрузить задачи',
        variant: 'destructive',
      });
    }
  };

  const startRegistration = async () => {
    try {
      const result = await api.registration.start();
      await loadTasks();
      
      setIsRunning(true);
      setProgress(0);

      toast({
        title: 'Регистрация запущена',
        description: `Создано ${result.tasksCreated} задач`,
      });

      let currentProgress = 0;
      const interval = setInterval(async () => {
        currentProgress += 10;
        setProgress(currentProgress);

        if (currentProgress >= 100) {
          clearInterval(interval);
          setIsRunning(false);
          await loadTasks();
          toast({
            title: 'Регистрация завершена',
            description: 'Все аккаунты обработаны',
          });
        }
      }, 1000);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось запустить регистрацию',
        variant: 'destructive',
      });
    }
  };

  const stopRegistration = () => {
    setIsRunning(false);
    toast({
      title: 'Регистрация остановлена',
      variant: 'destructive',
    });
  };

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const failedCount = tasks.filter(t => t.status === 'failed').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Регистрация аккаунтов</h2>
        <p className="text-muted-foreground">Автоматическое создание аккаунтов на Marktplaats.nl</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Всего задач</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{tasks.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Завершено</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{completedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ошибки</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{failedCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name="Info" size={20} className="text-blue-500" />
            Как работает регистрация
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">1</div>
            </div>
            <div>
              <p className="font-medium">Подготовка данных</p>
              <p className="text-muted-foreground">Загрузите Google аккаунты и прокси-серверы, настройте параметры</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">2</div>
            </div>
            <div>
              <p className="font-medium">Создание задач</p>
              <p className="text-muted-foreground">Система автоматически создаёт пары: 1 Google аккаунт + 1 прокси = 1 задача</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">3</div>
            </div>
            <div>
              <p className="font-medium">Автоматизация</p>
              <p className="text-muted-foreground">Открывается браузер через прокси → вход в Google → регистрация на Marktplaats</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">4</div>
            </div>
            <div>
              <p className="font-medium">Результаты</p>
              <p className="text-muted-foreground">Успешные аккаунты сохраняются, ошибки показываются в таблице</p>
            </div>
          </div>
          <div className="border-t pt-3 mt-3">
            <p className="font-medium text-amber-600 flex items-center gap-2">
              <Icon name="AlertTriangle" size={16} />
              Важно: 1 прокси = 1 аккаунт
            </p>
            <p className="text-muted-foreground mt-1">Каждый прокси может быть использован только для регистрации одного аккаунта</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Управление процессом</CardTitle>
          <CardDescription>
            Запустите или остановите процесс регистрации
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={startRegistration}
              disabled={isRunning}
              className="flex-1"
              size="lg"
            >
              <Icon name="Play" size={20} className="mr-2" />
              Запустить регистрацию
            </Button>
            <Button
              onClick={stopRegistration}
              disabled={!isRunning}
              variant="destructive"
              className="flex-1"
              size="lg"
            >
              <Icon name="Square" size={20} className="mr-2" />
              Остановить
            </Button>
          </div>

          {isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Прогресс</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {tasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Задачи регистрации</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Прокси</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Время создания</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.slice(0, 100).map((task) => (
                  <TableRow key={task.id} className={task.status === 'failed' ? 'bg-red-500/5' : ''}>
                    <TableCell className="font-medium">{task.email || 'N/A'}</TableCell>
                    <TableCell>{task.proxy || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge
                          variant={
                            task.status === 'completed'
                              ? 'default'
                              : task.status === 'processing'
                              ? 'secondary'
                              : task.status === 'failed'
                              ? 'destructive'
                              : 'outline'
                          }
                        >
                          {task.status === 'pending' && 'Ожидание'}
                          {task.status === 'processing' && 'Обработка'}
                          {task.status === 'completed' && 'Завершено'}
                          {task.status === 'failed' && 'Ошибка'}
                        </Badge>
                        {task.status === 'failed' && task.errorMessage && (
                          <div className="flex items-center gap-1 text-xs text-red-500">
                            <Icon name="AlertCircle" size={12} />
                            <span>{task.errorMessage}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(task.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {tasks.length > 100 && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                Показано 100 из {tasks.length} задач
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};