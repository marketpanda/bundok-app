
import {
  View,
  Pressable,
  StyleSheet,
} from "react-native";

import AppText from "@/components/ui/AppText";

import {
  AmbangegColors as colors,
  AmbangegSpacing as spacing,
  AmbangegRadius as radius,
} from "@/constants/ambangeg-theme";

import type { Mountain } from "@/types/mountain";

type MountainCardProps = {
  mountain: Mountain;
  onPress: (mountain: Mountain) => void;
};

export default function MountainCard({
  mountain,
  onPress,
}: MountainCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View details for ${mountain.name}`}
      onPress={() => onPress(mountain)}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.content}>
        <AppText variant="heading">
          {mountain.name}
        </AppText>

        <AppText variant="body">
          {mountain.location}
        </AppText>

        <AppText variant="caption">
          {mountain.elevationMeters.toLocaleString()} MASL
        </AppText>

        <AppText
          variant="caption"
          style={styles.trail}
        >
          {mountain.trails?.[0]?.name ?? "Trail information unavailable"}
        </AppText>
      </View>

      <AppText
        variant="heading"
        style={styles.arrow}
      >
        ›
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  trail: {
    color: colors.accent,
    marginTop: spacing.xs,
  },
  arrow: {
    color: colors.accent,
    marginLeft: spacing.md,
    fontSize: 30,
  },
  pressed: {
    opacity: 0.7,
  },
});
