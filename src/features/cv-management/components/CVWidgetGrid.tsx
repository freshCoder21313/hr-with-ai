import React from 'react';
import { UploadWidget } from '../widgets/UploadWidget';
import { ProfileWidget } from '../widgets/ProfileWidget';
import { TailorCVWidget } from '../widgets/TailorCVWidget';
import { CVChatWidget } from '../widgets/CVChatWidget';

export const CVWidgetGrid: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1">
        <UploadWidget />
      </div>

      <div className="lg:col-span-2">
        <ProfileWidget />
      </div>

      <div className="lg:col-span-1">
        <TailorCVWidget />
      </div>

      <div className="md:col-span-2 lg:col-span-4">
        <CVChatWidget />
      </div>
    </div>
  );
};
