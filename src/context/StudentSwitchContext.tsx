import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface StudentSwitchContextType {
  activeStudentId: string | null;
  activeStudentName: string | null;
  setActiveStudent: (id: string | null, name?: string | null) => void;
  clearActiveStudent: () => void;
  getEffectiveUserId: () => string | null;
  isViewingAsStudent: boolean;
}

const StudentSwitchContext = createContext<StudentSwitchContextType | undefined>(undefined);

export const StudentSwitchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [activeStudentName, setActiveStudentName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setActiveStudentId(null);
      setActiveStudentName(null);
    }
  }, [user]);

  const setActiveStudent = (id: string | null, name: string | null = null) => {
    setActiveStudentId(id);
    setActiveStudentName(name);
  };

  const clearActiveStudent = () => {
    setActiveStudentId(null);
    setActiveStudentName(null);
  };

  const getEffectiveUserId = () => {
    return activeStudentId || user?.id || null;
  };

  const isViewingAsStudent = !!activeStudentId;

  const value: StudentSwitchContextType = {
    activeStudentId,
    activeStudentName,
    setActiveStudent,
    clearActiveStudent,
    getEffectiveUserId,
    isViewingAsStudent,
  };

  return (
    <StudentSwitchContext.Provider value={value}>
      {children}
    </StudentSwitchContext.Provider>
  );
};

export const useStudentSwitch = () => {
  const context = useContext(StudentSwitchContext);
  if (context === undefined) {
    throw new Error('useStudentSwitch must be used within a StudentSwitchProvider');
  }
  return context;
};