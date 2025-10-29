import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { api, RegistrationTask } from '@/lib/api';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const StatisticsTab = () => {
  const [tasks, setTasks] = useState<RegistrationTask[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await api.registration.getTasks();
      setTasks(data);
    } catch (error) {
      toast({
        title: 'Ошибка загрузки',
        description: 'Не удалось загрузить статистику',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const failedTasks = tasks.filter(t => t.status === 'failed').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const processingTasks = tasks.filter(t => t.status === 'processing').length;

  const successRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const failureRate = totalTasks > 0 ? Math.round((failedTasks / totalTasks) * 100) : 0;

  const statusData = [
    { name: 'Завершено', value: completedTasks, color: '#10b981' },
    { name: 'Ошибки', value: failedTasks, color: '#ef4444' },
    { name: 'Ожидание', value: pendingTasks, color: '#6b7280' },
    { name: 'Обработка', value: processingTasks, color: '#3b82f6' },
  ];

  const timelineData = tasks
    .filter(t => t.completedAt)
    .reduce((acc, task) => {
      const date = new Date(task.createdAt).toLocaleDateString();
      const existing = acc.find(item => item.date === date);
      if (existing) {
        existing.count += 1;
        if (task.status === 'completed') existing.success += 1;
        if (task.status === 'failed') existing.failed += 1;
      } else {
        acc.push({
          date,
          count: 1,
          success: task.status === 'completed' ? 1 : 0,
          failed: task.status === 'failed' ? 1 : 0,
        });
      }
      return acc;
    }, [] as { date: string; count: number; success: number; failed: number }[]);

  const errorTasks = tasks.filter(t => t.status === 'failed' && t.errorMessage);

  const errorGroups = errorTasks.reduce((acc, task) => {
    const error = task.errorMessage || 'Неизвестная ошибка';
    if (!acc[error]) {
      acc[error] = { count: 0, tasks: [] };
    }
    acc[error].count += 1;
    acc[error].tasks.push(task);
    return acc;
  }, {} as Record<string, { count: number; tasks: RegistrationTask[] }>);

  const errorStats = Object.entries(errorGroups).map(([error, data]) => ({
    error,
    count: data.count,
    tasks: data.tasks,
  })).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Статистика и ошибки</h2>
        <p className="text-muted-foreground">Аналитика процесса регистрации</p>
      </div>

      {loading && tasks.length === 0 ? (
        <div className="flex items-center justify-center h-96">
          <Icon name="Loader" size={48} className="animate-spin opacity-50" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Всего задач</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalTasks}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Успешно</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-500">{completedTasks}</div>
                <p className="text-xs text-muted-foreground mt-1">{successRate}% успеха</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ошибки</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-500">{failedTasks}</div>
                <p className="text-xs text-muted-foreground mt-1">{failureRate}% ошибок</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">В процессе</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-500">{pendingTasks + processingTasks}</div>
                <p className="text-xs text-muted-foreground mt-1">Ожидание + обработка</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="charts" className="space-y-4">
            <TabsList>
              <TabsTrigger value="charts">
                <Icon name="BarChart3" size={16} className="mr-2" />
                Графики
              </TabsTrigger>
              <TabsTrigger value="errors">
                <Icon name="AlertTriangle" size={16} className="mr-2" />
                Ошибки ({failedTasks})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="charts" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Распределение по статусам</CardTitle>
                    <CardDescription>Текущее состояние задач</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Статистика по датам</CardTitle>
                    <CardDescription>Количество обработанных задач</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={timelineData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="success" name="Успешно" fill="#10b981" />
                        <Bar dataKey="failed" name="Ошибки" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Динамика регистрации</CardTitle>
                  <CardDescription>Общее количество задач по датам</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="count" name="Всего задач" stroke="#3b82f6" strokeWidth={2} />
                      <Line type="monotone" dataKey="success" name="Успешно" stroke="#10b981" strokeWidth={2} />
                      <Line type="monotone" dataKey="failed" name="Ошибки" stroke="#ef4444" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="errors" className="space-y-4">
              {failedTasks === 0 ? (
                <Alert>
                  <Icon name="CheckCircle" size={16} />
                  <AlertTitle>Отлично!</AlertTitle>
                  <AlertDescription>
                    Ошибок не обнаружено. Все задачи выполнены успешно.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Сводка ошибок</CardTitle>
                      <CardDescription>Группировка по типам ошибок</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {errorStats.map((stat, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Icon name="AlertCircle" size={16} className="text-red-500" />
                                <span className="font-medium">{stat.error}</span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                Затронуто аккаунтов: {stat.tasks.map(t => t.email).filter(Boolean).join(', ').slice(0, 50)}...
                              </p>
                            </div>
                            <Badge variant="destructive" className="ml-4">
                              {stat.count} {stat.count === 1 ? 'раз' : 'раза'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Детальный список ошибок</CardTitle>
                      <CardDescription>Все неудачные попытки регистрации</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Прокси</TableHead>
                            <TableHead>Ошибка</TableHead>
                            <TableHead>Время</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {errorTasks.slice(0, 50).map((task) => (
                            <TableRow key={task.id}>
                              <TableCell className="font-medium">{task.email || 'N/A'}</TableCell>
                              <TableCell className="text-muted-foreground">{task.proxy || 'N/A'}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Icon name="XCircle" size={16} className="text-red-500" />
                                  <span className="text-sm">{task.errorMessage}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {new Date(task.createdAt).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {errorTasks.length > 50 && (
                        <p className="text-center text-sm text-muted-foreground mt-4">
                          Показано 50 из {errorTasks.length} ошибок
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};
