
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[
    scheme === "unspecified" ? "light" : scheme
  ];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{
        selected: { color: colors.text },
      }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>
          Home
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          md="home"
          sf="house"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>
          Explore
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          md="explore"
          sf="safari"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="my-climbs">
        <NativeTabs.Trigger.Label>
          My Climbs
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          md="hiking"
          sf="figure.hiking"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>
          Profile
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          md="person"
          sf="person.crop.circle"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
