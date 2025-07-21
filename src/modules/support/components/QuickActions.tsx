import React from 'react';
import type { QuickAction } from '../types';
import { Sparkles } from 'lucide-react';

interface QuickActionsProps {
  actions: QuickAction[];
  onActionClick: (action: QuickAction) => void;
}

const QuickActionsComponent: React.FC<QuickActionsProps> = ({ actions, onActionClick }) => {
  return (
    <div className="p-4 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-medium text-gray-700">Quick Help</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => onActionClick(action)}
            className="text-left p-2 text-xs bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActionsComponent;
