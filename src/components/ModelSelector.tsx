
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface ModelOption {
  id: string;
  name: string;
  description: string;
  disabled?: boolean;
  badge?: string;
}

interface ModelSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
}

const models: ModelOption[] = [
  {
    id: 'flux_schnell',
    name: 'Flux Schnell',
    description: 'Fast generation (4 steps)',
    badge: 'Fast'
  },
  {
    id: 'flux_dev',
    name: 'Flux Dev',
    description: 'High quality generation (customizable steps)',
    badge: 'Quality'
  }
];

export const ModelSelector: React.FC<ModelSelectorProps> = ({ value, onValueChange }) => {
  return (
    <div className="space-y-2">
      <label className="text-gray-300 text-sm font-medium">Model</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-600">
          {models.map((model) => (
            <SelectItem
              key={model.id}
              value={model.id}
              disabled={model.disabled}
              className="text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col">
                  <span className="font-medium">{model.name}</span>
                  <span className="text-xs text-gray-400">{model.description}</span>
                </div>
                {model.badge && (
                  <Badge 
                    variant="outline" 
                    className={`ml-2 text-xs ${
                      model.disabled 
                        ? 'border-gray-600 text-gray-500' 
                        : model.badge === 'Fast' 
                          ? 'border-green-500 text-green-400'
                          : 'border-blue-500 text-blue-400'
                    }`}
                  >
                    {model.badge}
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
