import React, { useEffect, useState, useCallback } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { Text } from "react-native";
import { AuthContext, AuthUser } from "./src/lib/auth";
import { api } from "./src/lib/api";
import { RootStackParamList, TabParamList } from "./src/lib/types";

import LoginScreen from "./src/screens/auth/LoginScreen";
import RegisterScreen from "./src/screens/auth/RegisterScreen";
import SheetsScreen from "./src/screens/sheets/SheetsScreen";
import SheetDetailScreen from "./src/screens/sheets/SheetDetailScreen";
import ScannerScreen from "./src/screens/scanner/ScannerScreen";
import RowDetailScreen from "./src/screens/row/RowDetailScreen";
import RowCreateScreen from "./src/screens/row/RowCreateScreen";
import SettingsScreen from "./src/screens/settings/SettingsScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#2563eb" },
        headerTintColor: "#fff",
        tabBarActiveTintColor: "#2563eb",
      }}
    >
      <Tab.Screen
        name="Sheets"
        component={SheetsScreen}
        options={{
          title: "Sheets",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📋</Text>,
        }}
      />
      <Tab.Screen
        name="Scanner"
        component={ScannerScreen}
        options={{
          title: "Scanner",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📷</Text>,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⚙️</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = await api.getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      const data = await api.get<{ user: AuthUser }>("/auth/me");
      setUser(data.user);
    } catch {
      await api.clearTokens();
    } finally {
      setLoading(false);
    }
  }

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ user: AuthUser; accessToken: string; refreshToken: string }>("/auth/login", { email, password });
    await api.setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const data = await api.post<{ user: AuthUser; accessToken: string; refreshToken: string }>("/auth/register", { name, email, password });
    await api.setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await api.clearTokens();
    setUser(null);
  }, []);

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: "#2563eb" }, headerTintColor: "#fff" }}>
          {!user ? (
            <>
              <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
            </>
          ) : (
            <>
              <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
              <Stack.Screen name="SheetDetail" component={SheetDetailScreen} options={({ route }) => ({ title: route.params.sheetName })} />
              <Stack.Screen name="RowDetail" component={RowDetailScreen} options={{ title: "Edit Item" }} />
              <Stack.Screen name="RowCreate" component={RowCreateScreen} options={{ title: "New Item" }} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}
