import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { AccountsTab } from '@/components/tabs/AccountsTab';
import { ProxyTab } from '@/components/tabs/ProxyTab';
import { RegistrationTab } from '@/components/tabs/RegistrationTab';
import { ExportTab } from '@/components/tabs/ExportTab';
import { SettingsTab } from '@/components/tabs/SettingsTab';
import { StatisticsTab } from '@/components/tabs/StatisticsTab';

export type TabType = 'accounts' | 'proxy' | 'registration' | 'export' | 'statistics' | 'settings';

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabType>('accounts');

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6">
          {activeTab === 'accounts' && <AccountsTab />}
          {activeTab === 'proxy' && <ProxyTab />}
          {activeTab === 'registration' && <RegistrationTab />}
          {activeTab === 'export' && <ExportTab />}
          {activeTab === 'statistics' && <StatisticsTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </main>
    </div>
  );
};

export default Index;