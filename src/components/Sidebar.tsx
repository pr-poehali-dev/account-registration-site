import Icon from '@/components/ui/icon';
import { TabType } from '@/pages/Index';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const Sidebar = ({ activeTab, setActiveTab }: SidebarProps) => {
  const menuItems = [
    { id: 'accounts' as TabType, label: 'Аккаунты', icon: 'Users' },
    { id: 'proxy' as TabType, label: 'Прокси', icon: 'Globe' },
    { id: 'registration' as TabType, label: 'Регистрация', icon: 'UserPlus' },
    { id: 'export' as TabType, label: 'Экспорт', icon: 'Download' },
    { id: 'statistics' as TabType, label: 'Статистика', icon: 'BarChart3' },
    { id: 'settings' as TabType, label: 'Настройки', icon: 'Settings' },
  ];

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <Icon name="ShoppingBag" size={28} />
          Marktplaats Bot
        </h1>
      </div>
      <nav className="flex-1 p-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${
              activeTab === item.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Icon name={item.icon} size={20} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
};