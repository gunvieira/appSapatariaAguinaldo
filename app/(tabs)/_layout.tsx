import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#8C6239', // Destaque Cognac
                tabBarInactiveTintColor: '#9A8E85', // Cinza Quente
                tabBarStyle: {
                    backgroundColor: '#FFFFFF',
                    borderTopColor: '#E2DCD5',
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 8,
                },
                headerStyle: {
                    backgroundColor: '#FAF9F6',
                },
                headerTintColor: '#8C6239',
                headerTitleStyle: {
                    fontWeight: 'bold',
                    color: '#2C2520',
                },
                headerShadowVisible: false,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{ 
                    title: 'Dashboard',
                    headerShown: false, // Oculta o header padrão para usar o cabeçalho customizado na tela
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons 
                            name={focused ? "home" : "home-outline"} 
                            size={size} 
                            color={color} 
                        />
                    )
                }}
            />
            <Tabs.Screen
                name="ordens"
                options={{ 
                    title: 'Ordens',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons 
                            name={focused ? "document-text" : "document-text-outline"} 
                            size={size} 
                            color={color} 
                        />
                    )
                }}
            />
            <Tabs.Screen
                name="clientes"
                options={{ 
                    title: 'Clientes',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons 
                            name={focused ? "people" : "people-outline"} 
                            size={size} 
                            color={color} 
                        />
                    )
                }}
            />
            <Tabs.Screen
                name="vendas"
                options={{ 
                    title: 'Vendas',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons 
                            name={focused ? "cart" : "cart-outline"} 
                            size={size} 
                            color={color} 
                        />
                    )
                }}
            />
            <Tabs.Screen
                name="caixa"
                options={{ 
                    title: 'Caixa',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons 
                            name={focused ? "wallet" : "wallet-outline"} 
                            size={size} 
                            color={color} 
                        />
                    )
                }}
            />
        </Tabs>
    );
}