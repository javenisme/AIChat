import * as Zip from 'adm-zip';

import { Conversation } from '@/types/chat';
import {
  ExportFormatV1,
  ExportFormatV2,
  ExportFormatV3,
  ExportFormatV4,
  LatestExportFormat,
  SupportedExportFormats,
} from '@/types/export';
import { FolderInterface } from '@/types/folder';
import { Prompt } from '@/types/prompt';
import { StorageType } from '@/types/storage';

import { cleanConversationHistory } from './clean';
import {
  storageGetConversations,
  storageUpdateConversations,
} from './storage/conversations';
import { storageGetFolders, storageUpdateFolders } from './storage/folders';
import { storageCreateMessage, storageUpdateMessage } from './storage/message';
import { storageCreateMessages } from './storage/messages';
import { storageGetPrompts, storageUpdatePrompts } from './storage/prompts';
import { saveSelectedConversation } from './storage/selectedConversation';
import { deleteSelectedConversation } from './storage/selectedConversation';

export function isExportFormatV1(obj: any): obj is ExportFormatV1 {
  return Array.isArray(obj);
}

export function isExportFormatV2(obj: any): obj is ExportFormatV2 {
  return !('version' in obj) && 'folders' in obj && 'history' in obj;
}

export function isExportFormatV3(obj: any): obj is ExportFormatV3 {
  return obj.version === 3;
}

export function isExportFormatV4(obj: any): obj is ExportFormatV4 {
  return obj.version === 4;
}

export const isLatestExportFormat = isExportFormatV4;

export function cleanData(data: SupportedExportFormats): LatestExportFormat {
  if (isExportFormatV1(data)) {
    return {
      version: 4,
      history: cleanConversationHistory(data),
      folders: [],
      prompts: [],
    };
  }

  if (isExportFormatV2(data)) {
    return {
      version: 4,
      history: cleanConversationHistory(data.history || []),
      folders: (data.folders || []).map((chatFolder) => ({
        id: chatFolder.id.toString(),
        name: chatFolder.name,
        type: 'chat',
      })),
      prompts: [],
    };
  }

  if (isExportFormatV3(data)) {
    return { ...data, version: 4, prompts: [] };
  }

  if (isExportFormatV4(data)) {
    return data;
  }

  throw new Error('Unsupported data format');
}

function createFilename(kind: string, extension: string): string {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const day = String(currentDate.getDate()).padStart(2, '0');
  return `chatbot_ui_export_${year}${month}${day}_${kind}.${extension}`;
}

export const exportMarkdown = () => {
  const conversations = JSON.parse(localStorage.getItem('conversationHistory') || []);
  const folders = JSON.parse(localStorage.getItem('folders') || []);
  const zip = new Zip();

  // add folders as directories
  for (const folder of folders) {
    zip.addFile(`${folder.name}/`, null);
  }

  // Filter "chat" type folders and create an object with ids as keys and names as values
  const chatFolderNames: { [id: string]: string } = folders
    .filter((folder) => folder.type === "chat")
    .reduce((accumulator, folder) => {
      accumulator[folder.id] = folder.name;
      return accumulator;
    }, {});

  // add conversations as Markdown files
  for (const conversation of conversations) {
    let markdownContent = '';
    for (const message of conversation.messages) {
      markdownContent += `## ${message.role.charAt(0).toUpperCase() + message.role.slice(1)}\n\n${message.content}\n\n`;
    }
    const directory = conversation.folderId in chatFolderNames ? chatFolderNames[conversation.folderId] + '/' : '';
    zip.addFile(`${directory}${conversation.name}.md`, markdownContent);
  }

  const zipDownload = zip.toBuffer();
  const url = URL.createObjectURL(new Blob([zipDownload]));
  const link = document.createElement('a');
  link.download = createFilename('markdown', 'zip')
  link.href = url;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportData = async (storageType: StorageType) => {
  let history = await storageGetConversations(storageType);
  let folders = await storageGetFolders(storageType);
  let prompts = await storageGetPrompts(storageType);

  const data = {
    version: 4,
    history: history || [],
    folders: folders || [],
    prompts: prompts || [],
  } as LatestExportFormat;

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = createFilename('data', 'json')
  link.href = url;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const importData = async (
  storageType: StorageType,
  data: SupportedExportFormats,
): Promise<LatestExportFormat> => {
  const { history, folders, prompts } = cleanData(data);

  // Updating folders
  const oldFolders = await storageGetFolders(storageType);
  const newFolders: FolderInterface[] = [...oldFolders, ...folders].filter(
    (folder, index, self) =>
      index === self.findIndex((f) => f.id === folder.id),
  );

  await storageUpdateFolders(storageType, newFolders);

  // Updating conversations
  const oldConversations = await storageGetConversations(storageType);
  const newHistory: Conversation[] = [...oldConversations, ...history].filter(
    (conversation, index, self) =>
      index === self.findIndex((c) => c.id === conversation.id),
  );

  await storageUpdateConversations(storageType, newHistory);

  if (storageType === StorageType.RDBMS) {
    for (const conversation of history) {
      if (conversation.messages.length > 0) {
        storageCreateMessages(
          storageType,
          conversation,
          conversation.messages,
          newHistory,
        );
      }
    }
  }
  if (newHistory.length > 0) {
    saveSelectedConversation(newHistory[newHistory.length - 1]);
  } else {
    deleteSelectedConversation();
  }

  // Updating prompts
  const oldPrompts = await storageGetPrompts(storageType);
  const newPrompts: Prompt[] = [...oldPrompts, ...prompts].filter(
    (prompt, index, self) =>
      index === self.findIndex((p) => p.id === prompt.id),
  );

  storageUpdatePrompts(storageType, prompts);

  return {
    version: 4,
    history: newHistory,
    folders: newFolders,
    prompts: newPrompts,
  };
};
