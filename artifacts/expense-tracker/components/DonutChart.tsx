import React, { useEffect } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import type { Category } from "@/context/ExpenseContext";
import { useColors } from "@/hooks/useColors";

export interface DonutSegment {
  category: Category;
  value: number;
  color: string;
  label: string;
}

interface Props {
  segments: DonutSegment[];
  total: number;
  centerText?: string;
  centerSubtext?: string;
  size?: number;
}

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number
) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSegmentPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number
): string {
  if (Math.abs(endAngle - startAngle) >= 359.9) {
    return [
      `M ${(cx - outerR).toFixed(2)} ${cy}`,
      `A ${outerR} ${outerR} 0 1 1 ${(cx + outerR).toFixed(2)} ${cy}`,
      `A ${outerR} ${outerR} 0 1 1 ${(cx - outerR).toFixed(2)} ${cy}`,
      `M ${(cx - innerR).toFixed(2)} ${cy}`,
      `A ${innerR} ${innerR} 0 1 0 ${(cx + innerR).toFixed(2)} ${cy}`,
      `A ${innerR} ${innerR} 0 1 0 ${(cx - innerR).toFixed(2)} ${cy}`,
      "Z",
    ].join(" ");
  }
  const os = polarToCartesian(cx, cy, outerR, startAngle);
  const oe = polarToCartesian(cx, cy, outerR, endAngle);
  const is = polarToCartesian(cx, cy, innerR, startAngle);
  const ie = polarToCartesian(cx, cy, innerR, endAngle);
  const la = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${os.x.toFixed(2)} ${os.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 ${la} 1 ${oe.x.toFixed(2)} ${oe.y.toFixed(2)}`,
    `L ${ie.x.toFixed(2)} ${ie.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 ${la} 0 ${is.x.toFixed(2)} ${is.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

export function DonutChart({
  segments,
  total,
  centerText,
  centerSubtext,
  size = 160,
}: Props) {
  const colors = useColors();
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.42;
  const innerR = size * 0.26;
  const gap = 2;

  if (total === 0) {
    return (
      <View
        style={[
          styles.empty,
          { width: size, height: size, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          No data
        </Text>
      </View>
    );
  }

  let cumAngle = 0;
  const paths = segments
    .filter((s) => s.value > 0)
    .map((seg) => {
      const angle = (seg.value / total) * 360;
      const startAngle = cumAngle + gap / 2;
      const endAngle = cumAngle + angle - gap / 2;
      cumAngle += angle;
      const d = donutSegmentPath(cx, cy, outerR, innerR, startAngle, endAngle);
      return { ...seg, d };
    });

  return (
    <Animated.View
      entering={Platform.OS !== "web" ? FadeIn.duration(600) : undefined}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size}>
        {paths.map((p) => (
          <Path key={p.category} d={p.d} fill={p.color} />
        ))}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        {centerText && (
          <Text
            style={[
              styles.centerText,
              { color: colors.foreground, fontSize: size * 0.1 },
            ]}
          >
            {centerText}
          </Text>
        )}
        {centerSubtext && (
          <Text
            style={[
              styles.centerSub,
              { color: colors.mutedForeground, fontSize: size * 0.065 },
            ]}
          >
            {centerSubtext}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  centerText: {
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  centerSub: {
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  empty: {
    borderRadius: 9999,
    borderWidth: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
