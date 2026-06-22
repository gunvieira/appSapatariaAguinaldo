import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle: string;
    iconName: string;
    isHighlight?: boolean;
    style?: any;
    onPress?: () => void;
}

export default function MetricCard({ 
    title, 
    value, 
    subtitle, 
    iconName, 
    isHighlight = false,
    style,
    onPress
}: MetricCardProps) {
    const Container = onPress ? TouchableOpacity : View;

    return (
        <Container 
            onPress={onPress}
            activeOpacity={0.7}
            style={[
                styles.card,
                isHighlight ? styles.highlightCard : styles.defaultCard,
                style
            ]}
        >
            <View style={styles.headerRow}>
                <View style={[
                    styles.iconWrapper,
                    isHighlight ? styles.highlightIconWrapper : styles.defaultIconWrapper
                ]}>
                    <Ionicons 
                        name={iconName as any} 
                        size={20} 
                        color={isHighlight ? '#FAF9F6' : '#8C6239'} 
                    />
                </View>
                <Text 
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[
                        styles.title,
                        isHighlight ? styles.highlightText : styles.defaultTitleText
                    ]}
                >
                    {title}
                </Text>
            </View>
            <Text 
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                    styles.value,
                    isHighlight ? styles.highlightText : styles.defaultValText
                ]}
            >
                {value}
            </Text>
            <Text 
                numberOfLines={2}
                ellipsizeMode="tail"
                style={[
                    styles.subtitle,
                    isHighlight ? styles.highlightSubtext : styles.defaultSubtext
                ]}
            >
                {subtitle}
            </Text>
        </Container>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        shadowColor: '#2C2520',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    defaultCard: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E2DCD5',
    },
    highlightCard: {
        backgroundColor: '#8C6239', // Couro Cognac
        borderColor: '#8C6239',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    iconWrapper: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
    },
    defaultIconWrapper: {
        backgroundColor: '#F5F2EB',
    },
    highlightIconWrapper: {
        backgroundColor: 'rgba(250, 249, 246, 0.15)',
    },
    title: {
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 8,
        letterSpacing: 0.3,
        flex: 1,
    },
    defaultTitleText: {
        color: '#7A7067',
    },
    highlightText: {
        color: '#FAF9F6',
    },
    defaultValText: {
        color: '#2C2520',
    },
    value: {
        fontSize: 24,
        fontWeight: '800',
        marginVertical: 4,
    },
    subtitle: {
        fontSize: 10,
        marginTop: 2,
    },
    defaultSubtext: {
        color: '#9A8E85',
    },
    highlightSubtext: {
        color: '#FAF9F6A0',
    },
});
