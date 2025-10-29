import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface RegistrationTask {
  id: string;
  email: string;
  proxy: string;
  status: 'waiting' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
}

export const RegistrationTab = () => {
  const [tasks, setTasks] = useState<RegistrationTask[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const startRegistration = () => {
    if (tasks.length === 0) {
      const mockTasks: RegistrationTask[] = [
        { id: '1', email: 'test1@gmail.com', proxy: '192.168.1.1:8080', status: 'waiting', createdAt: new Date() },
        { id: '2', email: 'test2@gmail.com', proxy: '192.168.1.2:8080', status: 'waiting', createdAt: new Date() },
        { id: '3', email: 'test3@gmail.com', proxy: '192.168.1.3:8080', status: 'waiting', createdAt: new Date() },
      ];
      setTasks(mockTasks);
    }

    setIsRunning(true);
    setProgress(0);

    toast({
      title: 'Регистрация запущена',
      description: 'Начинаем создание аккаунтов Marktplaats',
    });

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 10;
      setProgress(currentProgress);

      if (currentProgress >= 100) {
        clearInterval(interval);
        setIsRunning(false);
        setTasks(prev => prev.map(task => ({ ...task, status: 'completed' as const })));
        toast({
          title: 'Регистрация завершена',
          description: 'Все аккаунты успешно созданы',
        });
      }
    }, 1000);
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
                    <TableCell className="font-medium">{task.email}</TableCell>
                    <TableCell>{task.proxy}</TableCell>
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
                        {task.status === 'waiting' && 'Ожидание'}
                        {task.status === 'processing' && 'Обработка'}
                        {task.status === 'completed' && 'Завершено'}
                        {task.status === 'failed' && 'Ошибка'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {task.createdAt.toLocaleTimeString()}
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
