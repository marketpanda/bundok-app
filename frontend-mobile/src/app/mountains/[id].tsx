
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";

import {
  Stack,
  useLocalSearchParams,
} from "expo-router";

import { mountains } from "../../data/mountains";

export default function MountainDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const mountain = mountains.find(
    (item) => item.slug === id
  );

  if (!mountain) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{ title: "Mountain Not Found" }}
        />
        <Text>Mountain not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Stack.Screen
        options={{ title: mountain.name }}
      />

      <Text style={styles.label}>
        MOUNTAIN DETAILS
      </Text>

      <Text style={styles.title}>
        {mountain.name}
      </Text>

      <Text style={styles.location}>
        {mountain.location}, Philippines
      </Text>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>
          Elevation
        </Text>
        <Text style={styles.infoValue}>
          {mountain.elevationMeters.toLocaleString()} MASL
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>
          Trail
        </Text>
        <Text style={styles.infoValue}>
          {mountain.trails?.map((trail) => trail.name).join(", ") ||
  "Trail information unavailable"}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7F1",
  },
  content: {
    padding: 20,
    gap: 16,
  },
  label: {
    fontSize: 12,
    letterSpacing: 2,
    color: "#60846A",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#204D35",
  },
  location: {
    fontSize: 16,
    color: "#526457",
  },
  infoCard: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E4EAE2",
  },
  infoLabel: {
    fontSize: 13,
    color: "#60846A",
    marginBottom: 8,
  },
  infoValue: {
    fontSize: 20,
    fontWeight: "600",
    color: "#204D35",
  },
});
