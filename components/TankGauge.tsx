import React from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import Svg, { Circle, G, Line, Text as SvgText, Path, Defs, RadialGradient, Stop, LinearGradient, TextPath } from 'react-native-svg';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
} from 'react-native-reanimated';

interface TankGaugeProps {
    porcentaje: number; // 0-100
    capacidad_litros?: number;
    size?: number;
}

const GAUGE_NUMBERS = [10, 20, 30, 40, 50, 60, 70, 80, 90];
const GAUGE_TICKS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95];

export default function TankGauge({ porcentaje, capacidad_litros = 100, size = 260 }: TankGaugeProps) {
    const isSmall = size < 120;

    const clipped = Math.max(0, Math.min(100, porcentaje));
    const rotation = useSharedValue(0);

    // Mapeo: 0% -> -135deg, 100% -> 135deg
    React.useEffect(() => {
        rotation.value = withTiming((clipped - 50) * 2.7, {
            duration: 1500,
            easing: Easing.out(Easing.back(1)),
        });
    }, [clipped]);

    const animatedNeedleStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));

    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.42;

    const getCoords = (val: number, r: number) => {
        const angle = (val - 50) * 2.7 * (Math.PI / 180) - Math.PI / 2;
        return {
            x: cx + r * Math.cos(angle),
            y: cy + r * Math.sin(angle)
        };
    };

    return (
        <View style={[styles.container, { width: size, height: size + (isSmall ? 25 : 40) }]}>
            <View style={{ width: size, height: size }}>
                <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <Defs>
                        {/* Metal Bezel Gradient */}
                        <LinearGradient id="bezelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor="#E2E8F0" />
                            <Stop offset="45%" stopColor="#94A3B8" />
                            <Stop offset="55%" stopColor="#94A3B8" />
                            <Stop offset="100%" stopColor="#475569" />
                        </LinearGradient>

                        {/* Dial Surface Gradient */}
                        <RadialGradient id="dialSurface" cx="50%" cy="50%" rx="50%" ry="50%">
                            <Stop offset="0%" stopColor="#FFFFFF" />
                            <Stop offset="90%" stopColor="#F8FAFC" />
                            <Stop offset="100%" stopColor="#E2E8F0" />
                        </RadialGradient>

                        {/* Glass Reflection */}
                        <LinearGradient id="glassReflection" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
                            <Stop offset="30%" stopColor="#FFFFFF" stopOpacity="0.05" />
                            <Stop offset="70%" stopColor="#FFFFFF" stopOpacity="0" />
                            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.2" />
                        </LinearGradient>

                        {/* Path for Curved Branding Text - Adjusted for better centering and height */}
                        <Path
                            id="qzTextPath"
                            d={`M ${cx - (size * 0.35)} ${cy + (size * 0.12)} A ${size * 0.40} ${size * 0.40} 0 0 0 ${cx + (size * 0.35)} ${cy + (size * 0.12)}`}
                        />
                    </Defs>

                    {/* Outer Bezel (Metal Frame) */}
                    <Circle cx={cx} cy={cy} r={size * 0.49} fill="url(#bezelGradient)" />
                    <Circle cx={cx} cy={cy} r={size * 0.46} fill="#1E293B" />
                    <Circle cx={cx} cy={cy} r={size * 0.45} fill="url(#bezelGradient)" />

                    {/* Sub-Bezel Inner Shadow */}
                    <Circle cx={cx} cy={cy} r={size * 0.44} fill="#000000" opacity={0.15} />

                    {/* Main Dial Face */}
                    <Circle cx={cx} cy={cy} r={size * 0.43} fill="url(#dialSurface)" />

                    {/* Realistic Tick Marks and Numbers */}
                    {GAUGE_TICKS.map((num) => {
                        const isMainNumber = GAUGE_NUMBERS.includes(num);
                        const isBigTick = num % 10 === 0 || num === 5 || num === 95 || num === 85;
                        const isDanger = num <= 20;
                        const isRedMark = num === 85;

                        // Proportional tick sizing
                        const tickLength = isBigTick ? size * 0.05 : size * 0.025;
                        const tickStartR = radius;
                        const tickEndR = radius - tickLength;

                        // Text radius logic changes to be proportional
                        const textR = radius * (isSmall ? 0.60 : 0.70);

                        const start = getCoords(num, tickStartR);
                        const end = getCoords(num, tickEndR);
                        const textPos = getCoords(num, textR);

                        // Decide if text should be shown (hide numbers if too small to avoid clutter)
                        // For small gauges, show only 20, 50, 80
                        const showText = isSmall
                            ? (num === 20 || num === 50 || num === 80)
                            : isMainNumber;

                        return (
                            <G key={num}>
                                <Line
                                    x1={start.x} y1={start.y}
                                    x2={end.x} y2={end.y}
                                    stroke={isRedMark ? "#EF4444" : isDanger ? "#F87171" : "#334155"}
                                    strokeWidth={size * (isBigTick ? 0.012 : 0.005)}
                                />
                                {showText && (
                                    <SvgText
                                        x={textPos.x}
                                        y={textPos.y + (size * 0.02)}
                                        fill={isRedMark ? "#EF4444" : "#1E293B"}
                                        fontSize={size * (isSmall ? 0.16 : 0.07)}
                                        fontWeight="900"
                                        textAnchor="middle"
                                        fontFamily={Platform.OS === 'ios' ? 'Inter-Bold' : 'sans-serif-condensed'}
                                    >
                                        {num}
                                    </SvgText>
                                )}
                            </G>
                        );
                    })}

                    {/* Danger Zone Arc (5% to 20%) */}
                    <Path
                        d={`M ${getCoords(5, radius - size * 0.06).x} ${getCoords(5, radius - size * 0.06).y} A ${radius - size * 0.06} ${radius - size * 0.06} 0 0 1 ${getCoords(20, radius - size * 0.06).x} ${getCoords(20, radius - size * 0.06).y}`}
                        fill="none"
                        stroke="#EF4444"
                        strokeWidth={size * 0.02}
                        strokeLinecap="round"
                    />

                    {/* High Level Arc Detail (near 85) */}
                    <Path
                        d={`M ${getCoords(80, radius - size * 0.06).x} ${getCoords(80, radius - size * 0.06).y} A ${radius - size * 0.06} ${radius - size * 0.06} 0 0 1 ${getCoords(90, radius - size * 0.06).x} ${getCoords(90, radius - size * 0.06).y}`}
                        fill="none"
                        stroke="#EF4444"
                        strokeWidth={size * 0.005}
                    />

                    {/* Branding / Decorative Labels (Hidden entirely on small gauges to keep it clean) */}
                    {!isSmall && (
                        <>
                            <SvgText
                                x={cx}
                                y={cy + radius * 0.45}
                                fill="#94A3B8"
                                fontSize={size * 0.028}
                                fontWeight="800"
                                textAnchor="middle"
                                letterSpacing={0.5}
                            >
                                POR CIENTO DE CAPACIDAD
                            </SvgText>

                            <SvgText
                                fill="#EF4444"
                                fontSize={size * 0.04}
                                fontWeight="900"
                                letterSpacing={1}
                            >
                                <TextPath href="#qzTextPath" startOffset="27%" textAnchor="middle">
                                    QZ Web Solutions
                                </TextPath>
                            </SvgText>

                            <SvgText
                                x={cx}
                                y={cy - radius * 0.35}
                                fill="#64748B"
                                fontSize={size * 0.035}
                                fontWeight="700"
                                textAnchor="middle"
                                opacity={0.6}
                            >
                                MÁXIMO LLENADO
                            </SvgText>
                        </>
                    )}

                    {/* Sub-ticks (every degree/percent approx) */}
                    {[...Array(91)].map((_, i) => {
                        const val = 5 + i;
                        if (GAUGE_TICKS.includes(val)) return null;

                        // Minimal ticks for sizes that allow it
                        if (isSmall && val % 2 !== 0) return null;

                        const r1 = radius;
                        const r2 = radius - (size * 0.015);
                        const { x: x1, y: y1 } = getCoords(val, r1);
                        const { x: x2, y: y2 } = getCoords(val, r2);
                        return (
                            <Line
                                key={`subtick_${val}`}
                                x1={x1} y1={y1}
                                x2={x2} y2={y2}
                                stroke="#94A3B8"
                                strokeWidth={size * 0.003}
                                opacity={0.5}
                            />
                        );
                    })}

                    {/* Glass Cover Shine (Overlay) - Below Needle */}
                    <Circle cx={cx} cy={cy} r={size * 0.44} fill="url(#glassReflection)" pointerEvents="none" />
                </Svg>

                {/* Needle Component (Animated) in a standard View to avoid layout clipping inside SVG */}
                <Animated.View style={[
                    StyleSheet.absoluteFill,
                    { alignItems: 'center', justifyContent: 'center' },
                    animatedNeedleStyle
                ]}>
                    {/* Shadow for needle - properly aligned and offset */}
                    <View style={{
                        position: 'absolute',
                        width: Math.max(2, size * 0.025),
                        height: radius * 1.05,
                        backgroundColor: 'rgba(0,0,0,0.15)',
                        bottom: (radius * 1.05) / 2 - (radius * 0.1) - (size * 0.008),
                        transform: [{ translateX: size * 0.008 }],
                        borderTopLeftRadius: size * 0.04,
                        borderTopRightRadius: size * 0.04,
                        borderBottomLeftRadius: 2,
                        borderBottomRightRadius: 2,
                    }} />

                    {/* Realistic Needle (Sword Shape) */}
                    <View style={{
                        width: Math.max(2, size * 0.03),
                        height: radius * 1.05,
                        backgroundColor: '#EF4444',
                        bottom: (radius * 1.05) / 2 - (radius * 0.1),
                        borderTopLeftRadius: size * 0.04,
                        borderTopRightRadius: size * 0.04,
                        borderBottomLeftRadius: 2,
                        borderBottomRightRadius: 2,
                    }} />

                    {/* Central Hub with depth */}
                    <View style={{
                        width: size * 0.15,
                        height: size * 0.15,
                        borderRadius: size * 0.075,
                        backgroundColor: '#EF4444',
                        position: 'absolute',
                        borderWidth: 1,
                        borderColor: '#DC2626',
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.4,
                        shadowRadius: 4,
                        elevation: 10,
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        {/* Hub Highlight */}
                        <View style={{
                            width: '80%',
                            height: '80%',
                            borderRadius: size * 0.06,
                            backgroundColor: '#F87171',
                            opacity: 0.3
                        }} />
                        <View style={{
                            width: size * 0.03,
                            height: size * 0.03,
                            borderRadius: size * 0.015,
                            backgroundColor: '#991B1B',
                            position: 'absolute'
                        }} />
                    </View>
                </Animated.View>
            </View>

            {/* Placed OUTSIDE the SVG to prevent clipping, positioned at bottom */}
            <View style={[styles.dataContainer, {
                bottom: 0,
                transform: [{ translateY: isSmall ? 10 : 25 }],
                paddingHorizontal: isSmall ? 8 : 16,
                paddingVertical: isSmall ? 2 : 6,
            }]}>
                <Text style={[styles.percentText, { fontSize: isSmall ? 14 : 22 }]}>
                    {clipped}%
                </Text>
                <Text style={[styles.litersText, { fontSize: isSmall ? 10 : 14 }]}>
                    {((clipped / 100) * capacidad_litros).toFixed(0)} L
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'flex-start',
        backgroundColor: 'transparent',
        position: 'relative'
    },
    dataContainer: {
        position: 'absolute',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 3,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    percentText: {
        fontWeight: '900',
        color: '#1E293B',
    },
    litersText: {
        color: '#64748B',
        fontWeight: '700',
    }
});
