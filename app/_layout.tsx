import { Stack } from 'expo-router';

export default function RootLayout() {
    return (
        <Stack>
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