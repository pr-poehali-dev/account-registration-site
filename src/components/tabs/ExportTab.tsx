import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

export const ExportTab = () => {
  const [format, setFormat] = useState<string>('csv');
  const [includeProxy, setIncludeProxy] = useState(true);
  const [includeGoogle, setIncludeGoogle] = useState(true);
  const [accountsCount, setAccountsCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    loadAccountsCount();
  }, []);

  const loadAccountsCount = async () => {
    try {
      const data = await api.export.getAccounts('json', true, true);
      setAccountsCount(data.accounts?.length || 0);
    } catch (error) {
      console.error('Failed to load accounts count:', error);
    }
  };

  const exportAccounts = async () => {
    try {
      const data = await api.export.getAccounts(format, includeGoogle, includeProxy);
      
      let content = '';
      const filename = `marktplaats_accounts.${format}`;
      
      if (format === 'json') {
        content = JSON.stringify(data.accounts, null, 2);
      } else {
        content = data;
      }

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Экспорт выполнен',
        description: `Файл сохранен как ${filename}`,
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось экспортировать аккаунты',
        variant: 'destructive',
      });
    }
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
              <span className="text-2xl font-bold">{accountsCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Готовы к экспорту</span>
              <span className="text-2xl font-bold text-primary">{accountsCount}</span>
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
              {accountsCount > 0 ? (
                <>
                  login:password
                  {includeGoogle && ' | email@gmail.com:pass'}
                  {includeProxy && ' | 192.168.1.1:8080'}
                </>
              ) : (
                'Нет данных для экспорта'
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
            disabled={accountsCount === 0}
          >
            <Icon name="Download" size={20} className="mr-2" />
            Экспортировать {accountsCount} аккаунтов
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
