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
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.email || 'N/A'}</TableCell>
                    <TableCell>{task.proxy || 'N/A'}</TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(task.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
