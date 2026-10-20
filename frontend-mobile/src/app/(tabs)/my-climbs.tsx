
import {
  View,
  Text,
  StyleSheet,
} from "react-native";

import {
  AmbangegColors as colors,
  AmbangegSpacing as spacing,
  AmbangegRadius as radius
} from '@/constants/ambangeg-theme';


export default function MyClimbsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Climbs</Text>

      <Text style={styles.description}>
        Your mountain adventures will appear here.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Your hiking journal
        </Text>

        <Text style={styles.cardDescription}>
          Keep track of your summits, climb dates,
          and mountain bagtags.
        </Text>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.primary,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  cardDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
});
