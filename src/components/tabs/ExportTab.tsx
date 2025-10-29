import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface ExportAccount {
  email: string;
  password: string;
  marktplaatsLogin: string;
  marktplaatsPassword: string;
  proxy: string;
}

export const ExportTab = () => {
  const [format, setFormat] = useState<string>('csv');
  const [includeProxy, setIncludeProxy] = useState(true);
  const [includeGoogle, setIncludeGoogle] = useState(true);
  const { toast } = useToast();

  const mockAccounts: ExportAccount[] = [
    {
      email: 'test1@gmail.com',
      password: 'pass123',
      marktplaatsLogin: 'user1_markt',
      marktplaatsPassword: 'markt_pass1',
      proxy: '192.168.1.1:8080',
    },
    {
      email: 'test2@gmail.com',
      password: 'pass456',
      marktplaatsLogin: 'user2_markt',
      marktplaatsPassword: 'markt_pass2',
      proxy: '192.168.1.2:8080',
    },
  ];

  const exportAccounts = () => {
    let content = '';
    
    if (format === 'csv') {
      const headers = ['Marktplaats Login', 'Marktplaats Password'];
      if (includeGoogle) headers.push('Google Email', 'Google Password');
      if (includeProxy) headers.push('Proxy');
      
      content = headers.join(',') + '\n';
      
      mockAccounts.forEach(acc => {
        const row = [acc.marktplaatsLogin, acc.marktplaatsPassword];
        if (includeGoogle) row.push(acc.email, acc.password);
        if (includeProxy) row.push(acc.proxy);
        content += row.join(',') + '\n';
      });
    } else if (format === 'txt') {
      mockAccounts.forEach(acc => {
        content += `Marktplaats: ${acc.marktplaatsLogin}:${acc.marktplaatsPassword}`;
        if (includeGoogle) content += ` | Google: ${acc.email}:${acc.password}`;
        if (includeProxy) content += ` | Proxy: ${acc.proxy}`;
        content += '\n';
      });
    } else if (format === 'json') {
      const exportData = mockAccounts.map(acc => ({
        marktplaats: {
          login: acc.marktplaatsLogin,
          password: acc.marktplaatsPassword,
        },
        ...(includeGoogle && {
          google: {
            email: acc.email,
            password: acc.password,
          },
        }),
        ...(includeProxy && { proxy: acc.proxy }),
      }));
      content = JSON.stringify(exportData, null, 2);
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marktplaats_accounts.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Экспорт выполнен',
      description: `Файл сохранен как marktplaats_accounts.${format}`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Экспорт аккаунтов</h2>
        <p className="text-muted-foreground">Выгрузка готовых аккаунтов Marktplaats</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Статистика</CardTitle>
            <CardDescription>Доступные для экспорта аккаунты</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Всего аккаунтов</span>
              <span className="text-2xl font-bold">{mockAccounts.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Готовы к экспорту</span>
              <span className="text-2xl font-bold text-primary">{mockAccounts.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Предпросмотр данных</CardTitle>
            <CardDescription>Пример экспортируемой строки</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg font-mono text-sm break-all">
              {mockAccounts.length > 0 && (
                <>
                  {mockAccounts[0].marktplaatsLogin}:{mockAccounts[0].marktplaatsPassword}
                  {includeGoogle && ` | ${mockAccounts[0].email}:${mockAccounts[0].password}`}
                  {includeProxy && ` | ${mockAccounts[0].proxy}`}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Настройки экспорта</CardTitle>
          <CardDescription>Выберите формат и данные для экспорта</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Формат файла</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (Excel)</SelectItem>
                <SelectItem value="txt">TXT (текстовый файл)</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <Label>Включить в экспорт</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="google"
                  checked={includeGoogle}
                  onCheckedChange={(checked) => setIncludeGoogle(checked as boolean)}
                />
                <Label htmlFor="google" className="cursor-pointer">
                  Google аккаунты (email и пароль)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="proxy"
                  checked={includeProxy}
                  onCheckedChange={(checked) => setIncludeProxy(checked as boolean)}
                />
                <Label htmlFor="proxy" className="cursor-pointer">
                  Прокси-серверы
                </Label>
              </div>
            </div>
          </div>

          <Button
            onClick={exportAccounts}
            className="w-full"
            size="lg"
            disabled={mockAccounts.length === 0}
          >
            <Icon name="Download" size={20} className="mr-2" />
            Экспортировать {mockAccounts.length} аккаунтов
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
