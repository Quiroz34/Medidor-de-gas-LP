import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import Animated, {
    useSharedValue,
    useAnimatedProps,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { colorNivel } from '@/services/ai';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface TankGaugeProps {
    porcentaje: number; // 0-100
    capacidad_kg: number;
    size?: number;
}

export default function TankGauge({ porcentaje, capacidad_kg, size = 220 }: TankGaugeProps) {
    const clipped = Math.max(0, Math.min(100, porcentaje));
    const radius = size / 2 - 16;
    const circumference = 2 * Math.PI * radius;
    // Solo mostramos 270° del arco (empezando desde abajo-izquierda)
    const arcLength = circumference * 0.75;
    const progress = useSharedValue(0);

    React.useEffect(() => {
        progress.value = withTiming(clipped / 100, {
            duration: 1200,
            easing: Easing.out(Easing.cubic),
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clipped]); // progress is a shared value ref — intentionally omitted

    const animatedProps = useAnimatedProps(() => ({
        strokeDashoffset: arcLength * (1 - progress.value),
    }));

    const color = colorNivel(clipped);
    const kg_restantes = ((clipped / 100) * capacidad_kg).toFixed(1);
    const cx = size / 2;
    const cy = size / 2;

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <Svg width={size} height={size}>
                <Defs>
                    <LinearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0%" stopColor={color} stopOpacity="1" />
                        <Stop offset="100%" stopColor={color} stopOpacity="0.4" />
                    </LinearGradient>
                </Defs>

                {/* Track (background arc) */}
                <Circle
                    cx={cx}
                    cy={cy}
                    r={radius}
                    stroke="#1E3A5F"
                    strokeWidth={14}
                    fill="none"
                    strokeDasharray={`${arcLength} ${circumference}`}
                    strokeDashoffset={0}
                    strokeLinecap="round"
                    rotation={135}
                    origin={`${cx}, ${cy}`}
                />

                {/* Progress arc */}
                <AnimatedCircle
                    cx={cx}
                    cy={cy}
                    r={radius}
                    stroke="url(#gaugeGrad)"
                    strokeWidth={14}
                    fill="none"
                    strokeDasharray={`${arcLength} ${circumference}`}
                    animatedProps={animatedProps}
                    strokeLinecap="round"
                    rotation={135}
                    origin={`${cx}, ${cy}`}
                />

                {/* Percentage text */}
                <SvgText
                    x={cx}
                    y={cy - 12}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize={size * 0.18}
                    fontWeight="bold"
                >
                    {clipped}%
                </SvgText>

                {/* kg label */}
                <SvgText
                    x={cx}
                    y={cy + 18}
                    textAnchor="middle"
                    fill="#94A3B8"
                    fontSize={size * 0.075}
                >
                    {kg_restantes} kg restantes
                </SvgText>
            </Svg>

            {/* Flame icon label */}
            <View style={styles.labelRow}>
                <Text style={[styles.levelLabel, { color }]}>
                    {clipped > 50 ? '🔥 Nivel alto' : clipped > 20 ? '⚠️ Nivel medio' : '🚨 Nivel crítico'}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    labelRow: {
        position: 'absolute',
        bottom: 10,
    },
    levelLabel: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
