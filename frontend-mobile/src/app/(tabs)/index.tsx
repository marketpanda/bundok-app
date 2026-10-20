
import PrimaryButton from "@/components/PrimaryButton";
import { View, Text, StyleSheet, Alert } from "react-native";

export default function HomeScreen() {

  const handleExplore = () => {
    Alert.alert(
      "Ambangeg",
      "Let's explore Philippines mountains!"
    )
  }
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Welcome to Ambangeg!
      </Text>

      <Text style={styles.subtitle}>
        Your Philippine hiking companion.
      </Text>
      <View style={styles.buttonContainer}>
        <PrimaryButton
          title="Explore Mountains"
          onPress={handleExplore}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F7F1",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#204D35",
  },
  subtitle: {
    fontSize: 16,
    color: "#526457",
    marginTop: 12,
    textAlign: "center",
  },
  buttonContainer: {
    marginTop: 28,
    width: "100%",
  }
});
