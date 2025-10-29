import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface GoogleAccount {
  id: string;
  email: string;
  password: string;
  status: 'ready' | 'in_use' | 'failed';
}

export const AccountsTab = () => {
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      const newAccounts: GoogleAccount[] = lines.map((line, index) => {
        const [email, password] = line.split(':');
        return {
          id: `acc-${Date.now()}-${index}`,
          email: email?.trim() || '',
          password: password?.trim() || '',
          status: 'ready' as const,
        };
      }).filter(acc => acc.email && acc.password);

      setAccounts(prev => [...prev, ...newAccounts]);
      toast({
        title: 'Аккаунты загружены',
        description: `Добавлено ${newAccounts.length} аккаунтов`,
      });
    };
    reader.readAsText(file);
  };

  const deleteAccount = (id: string) => {
    setAccounts(prev => prev.filter(acc => acc.id !== id));
    toast({
      title: 'Аккаунт удален',
      variant: 'destructive',
    });
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
            Загрузите файл формата: email:password (по одному на строку)
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
          {accounts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Icon name="Users" size={48} className="mx-auto mb-4 opacity-50" />
              <p>Аккаунты не загружены</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Пароль</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-[100px]">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.email}</TableCell>
                    <TableCell>{'•'.repeat(8)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          account.status === 'ready'
                            ? 'default'
                            : account.status === 'in_use'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {account.status === 'ready' && 'Готов'}
                        {account.status === 'in_use' && 'Используется'}
                        {account.status === 'failed' && 'Ошибка'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteAccount(account.id)}
                      >
                        <Icon name="Trash2" size={16} />
                      </Button>
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
