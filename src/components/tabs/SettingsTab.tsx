import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

export const SettingsTab = () => {
  const [delayMin, setDelayMin] = useState([5]);
  const [delayMax, setDelayMax] = useState([15]);
  const [parallelTasks, setParallelTasks] = useState([3]);
  const [autoRetry, setAutoRetry] = useState(true);
  const [useRandomDelay, setUseRandomDelay] = useState(true);
  const { toast } = useToast();

  const saveSettings = () => {
    toast({
      title: 'Настройки сохранены',
      description: 'Изменения успешно применены',
    });
  };

  const resetSettings = () => {
    setDelayMin([5]);
    setDelayMax([15]);
    setParallelTasks([3]);
    setAutoRetry(true);
    setUseRandomDelay(true);
    toast({
      title: 'Настройки сброшены',
      description: 'Восстановлены значения по умолчанию',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Настройки</h2>
        <p className="text-muted-foreground">Конфигурация параметров регистрации</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Задержки между действиями</CardTitle>
          <CardDescription>
            Настройка интервалов для имитации человеческого поведения
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Минимальная задержка</Label>
                <span className="text-sm text-muted-foreground">{delayMin[0]} сек</span>
              </div>
              <Slider
                value={delayMin}
                onValueChange={setDelayMin}
                min={1}
                max={30}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Максимальная задержка</Label>
                <span className="text-sm text-muted-foreground">{delayMax[0]} сек</span>
              </div>
              <Slider
                value={delayMax}
                onValueChange={setDelayMax}
                min={5}
                max={60}
                step={1}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Случайные задержки</Label>
              <p className="text-sm text-muted-foreground">
                Использовать случайные интервалы в указанном диапазоне
              </p>
            </div>
            <Switch checked={useRandomDelay} onCheckedChange={setUseRandomDelay} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Параллельная обработка</CardTitle>
          <CardDescription>
            Количество одновременно выполняемых задач регистрации
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Потоков регистрации</Label>
              <span className="text-sm text-muted-foreground">{parallelTasks[0]}</span>
            </div>
            <Slider
              value={parallelTasks}
              onValueChange={setParallelTasks}
              min={1}
              max={10}
              step={1}
            />
            <p className="text-sm text-muted-foreground">
              Рекомендуется: 2-4 потока для стабильной работы
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Обработка ошибок</CardTitle>
          <CardDescription>Поведение при возникновении проблем</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Автоматический повтор</Label>
              <p className="text-sm text-muted-foreground">
                Повторять неудачные попытки регистрации
              </p>
            </div>
            <Switch checked={autoRetry} onCheckedChange={setAutoRetry} />
          </div>

          <div className="space-y-2">
            <Label>Максимум попыток</Label>
            <Input type="number" defaultValue="3" min="1" max="10" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Настройки Marktplaats</CardTitle>
          <CardDescription>Параметры для создания профиля</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Префикс имени пользователя</Label>
            <Input placeholder="user_" />
            <p className="text-sm text-muted-foreground">
              Будет добавлен перед сгенерированным именем
            </p>
          </div>

          <div className="space-y-2">
            <Label>Регион регистрации</Label>
            <Input defaultValue="Nederland" />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button onClick={saveSettings} className="flex-1" size="lg">
          <Icon name="Save" size={20} className="mr-2" />
          Сохранить настройки
        </Button>
        <Button onClick={resetSettings} variant="outline" className="flex-1" size="lg">
          <Icon name="RotateCcw" size={20} className="mr-2" />
          Сбросить
        </Button>
      </div>
    </div>
  );
};
