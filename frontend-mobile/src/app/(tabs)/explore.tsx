
import { useState } from "react";

import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
} from "react-native";

import MountainCard from "../../components/MountainCard";
import { mountains } from "../../data/mountains";
import type { Mountain } from "../../types/mountain";
import { useRouter } from "expo-router";

export default function ExploreScreen() {
  const [search, setSearch] = useState("");

  const filteredMountains = mountains.filter(
    (mountain) =>
      mountain.name
        .toLowerCase()
        .includes(search.toLowerCase())
  );
  const router = useRouter();

  const handleMountainPress = (mountain: Mountain) => {
    router.push({
      pathname: "/mountains/[id]",
      params: { id: mountain.slug }
    })
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredMountains}
        keyExtractor={(item) => item.slug}
        renderItem={({ item }) => (
          <MountainCard
            mountain={item}
            onPress={handleMountainPress}
          />
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>
              Explore Mountains
            </Text>

            <Text style={styles.subtitle}>
              Discover your next adventure
            </Text>

            <TextInput
              style={styles.search}
              placeholder="Search mountains..."
              placeholderTextColor="#87958B"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            No mountains found.
          </Text>
        }
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7F1",
  },
  list: {
    padding: 20,
    flexGrow: 1,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#204D35",
  },
  subtitle: {
    fontSize: 15,
    color: "#526457",
    marginTop: 6,
    marginBottom: 20,
  },
  search: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E4EAE2",
    paddingHorizontal: 16,
    height: 50,
    fontSize: 16,
    color: "#204D35",
  },
  empty: {
    textAlign: "center",
    color: "#526457",
    marginTop: 30,
  },
});
