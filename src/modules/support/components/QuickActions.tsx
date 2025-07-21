import React from 'react';
import type { QuickAction } from '../types';

interface QuickActionsProps {
  actions: QuickAction[];
  onActionClick: (action: QuickAction) => void;
}

const QuickActionsComponent: React.FC<QuickActionsProps> = ({ actions, onActionClick }) => {
  return (
    <div className="p-3 border-t border-gray-200 bg-gray-50">
      <div className="grid grid-cols-2 gap-1.5">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => onActionClick(action)}
            className="text-left p-1.5 text-xs bg-white border border-gray-200 rounded-md hover:bg-primary-50 hover:border-blue-300 transition-colors"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActionsComponent;
