import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { Select } from './Select';

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className="flex items-center gap-2">
      <Languages className="h-4 w-4 text-text-muted" />
      <Select
        value={i18n.language}
        onChange={handleLanguageChange}
        options={[
          { label: "English", value: "en" },
          { label: "اردو", value: "ur" }
        ]}
        className="w-28 py-1.5"
      />
    </div>
  );
};
