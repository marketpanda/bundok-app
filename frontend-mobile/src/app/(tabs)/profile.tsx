
import { View, StyleSheet } from "react-native";

import ScreenContainer from "@/components/ui/ScreenContainer";
import AppText from "@/components/ui/AppText";

import {
  AmbangegColors as colors,
  AmbangegSpacing as spacing,
  AmbangegRadius as radius,
} from "@/constants/ambangeg-theme";

export default function ProfileScreen() {
  return (
    <ScreenContainer>
      <AppText variant="title">
        Profile
      </AppText>

      <AppText
        variant="body"
        style={styles.description}
      >
        Manage your Ambangeg hiking profile.
      </AppText>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <AppText
            variant="heading"
            style={styles.avatarText}
          >
            H
          </AppText>
        </View>

        <AppText variant="heading">
          Guest Hiker
        </AppText>

        <AppText variant="caption">
          Not signed in
        </AppText>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  description: {
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.xxl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    gap: spacing.sm,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 30,
    color: colors.primary,
  },
});
