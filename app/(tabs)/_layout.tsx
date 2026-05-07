import { Tabs } from 'expo-router';

export default function TabsLayout() {
    return (
        <Tabs>
            <Tabs.Screen
                name="index"
                options={{ title: 'Dashboard' }}
            />
            <Tabs.Screen
                name="ordens"
                options={{ title: 'Ordens' }}
            />
            <Tabs.Screen
                name="vendas"
                options={{ title: 'Vendas' }}
            />
            <Tabs.Screen
                name="caixa"
                options={{ title: 'Caixa' }}
            />
        </Tabs>
    );
}