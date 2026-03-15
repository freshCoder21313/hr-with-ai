// src/features/cv-management/widgets/widgets.config.ts
import React from 'react';
import { UploadWidget } from './UploadWidget';
import { ProfileWidget } from './ProfileWidget';
import { TailorCVWidget } from './TailorCVWidget';
import { CVChatWidget } from './CVChatWidget';

export interface WidgetConfig {
  id: string;
  Component: React.FC;
  title: string;
}

export const widgets: WidgetConfig[] = [
  {
    id: 'upload',
    Component: UploadWidget,
    title: 'Upload & Parse CV',
  },
  {
    id: 'profile',
    Component: ProfileWidget,
    title: 'Parsed CV Profile',
  },
  {
    id: 'tailor',
    Component: TailorCVWidget,
    title: 'Tailor CV to Job Description',
  },
  {
    id: 'chat',
    Component: CVChatWidget,
    title: 'Chat with your CV',
  },
];
