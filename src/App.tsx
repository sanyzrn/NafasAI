import { useEffect, useRef } from 'react';
import { useAuthStore } from './store/authStore';
import { useAppStore } from './store/appStore';
import LoginPage from './components/LoginPage';
import Layout from './components/Layout';
import { Toaster } from 'react-hot-toast';

export default function App() {
  const { isAuthenticated, theme } = useAuthStore();
  const { loadConversations, loadConfig, resetUserState } = useAppStore();
  const prevAuthRef = useRef(isAuthenticated);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const wasAuthenticated = prevAuthRef.current;
    prevAuthRef.current = isAuthenticated;

    if (isAuthenticated) {
      loadConversations();
      loadConfig();
    } else if (wasAuthenticated) {
      // User just logged out — purge sensitive data from memory and localStorage
      resetUserState();
    }
  }, [isAuthenticated, loadConversations, loadConfig, resetUserState]);

  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-right" />
        <LoginPage />
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <Layout />
    </>
  );
}
