import { Stack } from 'expo-router';

export default function RootLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#FAF9F6', // Off-white quente
                },
                headerTintColor: '#8C6239', // Couro Cognac
                headerTitleStyle: {
                    fontWeight: 'bold',
                    color: '#2C2520', // Café Escuro
                },
                headerShadowVisible: false,
            }}
        >
            <Stack.Screen
                name="(tabs)"
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="os/nova"
                options={{ title: 'Nova Ordem de Serviço' }}
            />
            <Stack.Screen
                name="os/[id]"
                options={{ title: 'Detalhes da OS' }}
            />
        </Stack>
    );
}