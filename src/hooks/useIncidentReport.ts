import { useState } from 'react';

interface UseIncidentReportReturn {
  showReportForm: boolean;
  openReportForm: () => void;
  closeReportForm: () => void;
}

export const useIncidentReport = (): UseIncidentReportReturn => {
  const [showReportForm, setShowReportForm] = useState(false);

  const openReportForm = () => setShowReportForm(true);
  const closeReportForm = () => setShowReportForm(false);

  return {
    showReportForm,
    openReportForm,
    closeReportForm
  };
};

export default useIncidentReport;
