import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { api, Proxy } from '@/lib/api';

export const ProxyTab = () => {
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProxies();
  }, []);

  const loadProxies = async () => {
    setLoading(true);
    try {
      const data = await api.proxies.getAll();
      setProxies(data);
    } catch (error) {
      toast({
        title: 'Ошибка загрузки',
        description: 'Не удалось загрузить прокси',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      const newProxies: { host: string; port: string; username?: string; password?: string }[] = lines
        .map(line => {
          const parts = line.split(':');
          if (parts.length >= 2) {
            return {
              host: parts[0].trim(),
              port: parts[1].trim(),
              username: parts[2]?.trim(),
              password: parts[3]?.trim(),
            };
          }
          return null;
        })
        .filter((proxy): proxy is { host: string; port: string; username?: string; password?: string } => proxy !== null);

      try {
        await api.proxies.add(newProxies);
        await loadProxies();
        toast({
          title: 'Прокси загружены',
          description: `Добавлено ${newProxies.length} прокси-серверов`,
        });
      } catch (error) {
        toast({
          title: 'Ошибка',
          description: 'Не удалось добавить прокси',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
  };

  const deleteProxy = async (id: number) => {
    try {
      await api.proxies.delete(id);
      await loadProxies();
      toast({
        title: 'Прокси удален',
        variant: 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить прокси',
        variant: 'destructive',
      });
    }
  };

  const testProxy = async (id: number) => {
    try {
      await api.proxies.test(id);
      await loadProxies();
      toast({
        title: 'Проверка завершена',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось проверить прокси',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Прокси-серверы</h2>
        <p className="text-muted-foreground">Управление прокси для регистрации</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Загрузка прокси</CardTitle>
          <CardDescription>
            Формат: host:port или host:port:username:password (по одному на строку)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".txt,.csv"
              onChange={handleFileUpload}
              className="flex-1"
            />
            <Badge variant="outline" className="text-sm">
              Всего: {proxies.length}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Список прокси</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Icon name="Loader" size={48} className="mx-auto mb-4 opacity-50 animate-spin" />
              <p>Загрузка...</p>
            </div>
          ) : proxies.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Icon name="Globe" size={48} className="mx-auto mb-4 opacity-50" />
              <p>Прокси не загружены</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Адрес</TableHead>
                  <TableHead>Порт</TableHead>
                  <TableHead>Авторизация</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-[150px]">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proxies.map((proxy) => (
                  <TableRow key={proxy.id}>
                    <TableCell className="font-medium">{proxy.host}</TableCell>
                    <TableCell>{proxy.port}</TableCell>
                    <TableCell>
                      {proxy.username ? (
                        <Badge variant="outline">Да</Badge>
                      ) : (
                        <Badge variant="secondary">Нет</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          proxy.status === 'active'
                            ? 'default'
                            : proxy.status === 'checking'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {proxy.status === 'active' && 'Активен'}
                        {proxy.status === 'checking' && 'Проверка...'}
                        {proxy.status === 'failed' && 'Не работает'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => testProxy(proxy.id)}
                          disabled={proxy.status === 'checking'}
                        >
                          <Icon name="RefreshCw" size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteProxy(proxy.id)}
                        >
                          <Icon name="Trash2" size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
