
import type { PropsWithChildren } from "react";
import {
  View,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from "react-native";

import {
  AmbangegColors as colors,
  AmbangegSpacing as spacing,
} from "@/constants/ambangeg-theme";

type ScreenContainerProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export default function ScreenContainer({
  children,
  style,
}: ScreenContainerProps) {
  return (
    <View style={[styles.container, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
});
