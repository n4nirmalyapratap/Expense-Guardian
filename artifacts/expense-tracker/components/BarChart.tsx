import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { useColors } from "@/hooks/useColors";

interface Bar {
  label: string;
  value: number;
}

interface Props {
  data: Bar[];
  height?: number;
  barColor?: string;
}

export function BarChart({ data, height = 160, barColor }: Props) {
  const colors = useColors();
  const color = barColor ?? colors.primary;
  const chartWidth = 300;
  const chartHeight = height - 36;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barCount = data.length;
  const totalGap = (barCount + 1) * 6;
  const barWidth = (chartWidth - totalGap) / barCount;

  return (
    <Animated.View
      entering={Platform.OS !== "web" ? FadeInUp.delay(200).duration(500) : undefined}
      style={styles.container}
    >
      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <LinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={color} stopOpacity="0.3" />
          </LinearGradient>
        </Defs>
        {data.map((bar, i) => {
          const barHeight = (bar.value / maxVal) * chartHeight;
          const x = 6 + i * (barWidth + 6);
          const y = chartHeight - barHeight;
          return (
            <Rect
              key={i}
              x={x}
              y={bar.value > 0 ? y : chartHeight - 2}
              width={barWidth}
              height={bar.value > 0 ? barHeight : 2}
              rx={6}
              fill="url(#barGrad)"
            />
          );
        })}
      </Svg>
      <View style={[styles.labels, { width: chartWidth }]}>
        {data.map((bar, i) => (
          <View key={i} style={{ width: barWidth + 6, alignItems: "center" }}>
            <Text
              style={[styles.label, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {bar.label}
            </Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  labels: {
    flexDirection: "row",
    marginTop: 4,
    paddingLeft: 6,
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
});
