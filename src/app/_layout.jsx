import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Slot } from 'expo-router';
import { RecipeProvider } from '../context/RecipeContext';
import { AuthProvider } from '../context/AuthContext';
import { DialogHost } from '../components/ui/DialogHost';
SplashScreen.preventAutoHideAsync().catch(() => {});
export default function RootLayout() {
  useEffect(() => {
    // Hide splash screen after initialization
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  return <AuthProvider><RecipeProvider>
      <StatusBar style="dark" />
      <Slot />
      {/* Every alert / confirmation of the app (utils/dialog.js) */}
      <DialogHost />
    </RecipeProvider></AuthProvider>;
}
