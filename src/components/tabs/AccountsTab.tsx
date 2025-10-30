import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { api, GoogleAccount } from '@/lib/api';

export const AccountsTab = () => {
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await api.accounts.getAll();
      setAccounts(data);
    } catch (error) {
      toast({
        title: 'Ошибка загрузки',
        description: 'Не удалось загрузить аккаунты',
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
      
      const newAccounts: { email: string; password: string }[] = lines
        .map(line => {
          const [email, password] = line.split(':');
          return {
            email: email?.trim() || '',
            password: password?.trim() || '',
          };
        })
        .filter(acc => acc.email && acc.password);

      try {
        await api.accounts.add(newAccounts);
        await loadAccounts();
        toast({
          title: 'Аккаунты загружены',
          description: `Добавлено ${newAccounts.length} аккаунтов`,
        });
      } catch (error) {
        toast({
          title: 'Ошибка',
          description: 'Не удалось добавить аккаунты',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
  };

  const deleteAccount = async (id: number) => {
    try {
      await api.accounts.delete(id);
      await loadAccounts();
      toast({
        title: 'Аккаунт удален',
        variant: 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить аккаунт',
        variant: 'destructive',
      });
    }
  };

  const testAccount = async (id: number) => {
    try {
      const result = await api.accounts.test(id);
      await loadAccounts();
      toast({
        title: result.success ? 'Аккаунт работает' : 'Ошибка входа',
        description: result.message || (result.success ? 'Вход выполнен успешно' : 'Не удалось войти в аккаунт'),
        variant: result.success ? 'default' : 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Ошибка проверки',
        description: 'Не удалось проверить аккаунт',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Google Аккаунты</h2>
        <p className="text-muted-foreground">Управление аккаунтами для регистрации</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Загрузка аккаунтов</CardTitle>
          <CardDescription>
            Загрузите файл формата: email:password (по одному на строку). Email может быть любым — не обязательно @gmail.com, главное чтобы это был Google аккаунт
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
              Всего: {accounts.length}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Список аккаунтов</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Icon name="Loader" size={48} className="mx-auto mb-4 opacity-50 animate-spin" />
              <p>Загрузка...</p>
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Icon name="Users" size={48} className="mx-auto mb-4 opacity-50" />
              <p>Аккаунты не загружены</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата добавления</TableHead>
                  <TableHead className="w-[150px]">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          account.status === 'active' || account.status === 'ready'
                            ? 'default'
                            : account.status === 'checking'
                            ? 'secondary'
                            : account.status === 'in_use'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {(account.status === 'active' || account.status === 'ready') && 'Готов'}
                        {account.status === 'checking' && 'Проверка...'}
                        {account.status === 'in_use' && 'Используется'}
                        {account.status === 'failed' && 'Ошибка'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(account.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => testAccount(account.id)}
                          disabled={account.status === 'in_use' || account.status === 'checking'}
                          title="Проверить аккаунт"
                        >
                          <Icon name="CheckCircle" size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteAccount(account.id)}
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