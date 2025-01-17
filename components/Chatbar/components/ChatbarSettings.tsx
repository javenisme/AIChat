import { IconFileExport, IconMarkdown, IconLogout, IconSettings } from '@tabler/icons-react';
import { signOut, signIn, getSession } from 'next-auth/react';
import { useContext, useEffect, useState } from 'react';

import { useTranslation } from 'next-i18next';

import { NEXT_PUBLIC_NEXTAUTH_ENABLED } from '@/utils/app/const';

import HomeContext from '@/pages/api/home/home.context';

import { SettingDialog } from '@/components/Settings/SettingDialog';

import { Import } from '../../Settings/Import';
import { Key } from '../../Settings/Key';
import { SidebarButton } from '../../Sidebar/SidebarButton';
import ChatbarContext from '../Chatbar.context';
import { ClearConversations } from './ClearConversations';
import { PluginKeys } from './PluginKeys';
import { Session } from 'next-auth';

export const ChatbarSettings = () => {
  const { t } = useTranslation('sidebar');
  const [isSettingDialogOpen, setIsSettingDialog] = useState<boolean>(false);
  const [session, setSession] = useState<Session | null>()

  const {
    state: {
      apiKey,
      lightMode,
      storageType: databaseType,
      serverSideApiKeyIsSet,
      serverSidePluginKeysSet,
      conversations,
    },
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const {
    handleClearConversations,
    handleImportConversations,
    handleExportData,
    handleExportMarkdown,
    handleApiKeyChange,
  } = useContext(ChatbarContext);

  useEffect(() => {
    getSession().then(session => {
      setSession(session);
    })
  }, [])

  return (
    <div className="flex flex-col items-center space-y-1 border-t border-white/20 pt-1 text-sm">
      {conversations.length > 0 ? (
        <ClearConversations onClearConversations={handleClearConversations} />
      ) : null}

      <Import onImport={handleImportConversations} />

      <SidebarButton
        text={t('Export data')}
        icon={<IconFileExport size={18} />}
        onClick={() => handleExportData(databaseType || 'localStorage')}
      />

      <SidebarButton
        text={t('Export Markdown')}
        icon={<IconMarkdown size={18} />}
        onClick={() => handleExportMarkdown()}
      />

      <SidebarButton
        text={t('Settings')}
        icon={<IconSettings size={18} />}
        onClick={() => setIsSettingDialog(true)}
      />

      {!serverSideApiKeyIsSet ? (
        <Key apiKey={apiKey} onApiKeyChange={handleApiKeyChange} />
      ) : null}

      {!serverSidePluginKeysSet ? <PluginKeys /> : null}

      {NEXT_PUBLIC_NEXTAUTH_ENABLED && (!session ?
        <SidebarButton
          text={t('Log In')}
          icon={<IconLogout size={18} />}
          onClick={() => signIn()}
        /> :
        <SidebarButton
          text={t('Log Out')}
          icon={<IconLogout size={18} />}
          onClick={() => signOut()}
        />
      )}

      <SettingDialog
        open={isSettingDialogOpen}
        onClose={() => {
          setIsSettingDialog(false);
        }}
      />
    </div>
  );
};
