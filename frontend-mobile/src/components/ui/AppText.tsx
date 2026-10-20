
import {
  Text,
  StyleSheet,
  type TextProps,
} from "react-native";

import {
  AmbangegColors as colors,
} from "@/constants/ambangeg-theme";

type TextVariant =
  | "title"
  | "heading"
  | "body"
  | "caption";

type AppTextProps = TextProps & {
  variant?: TextVariant;
  color?: string;
};

export default function AppText({
  variant = "body",
  color,
  style,
  children,
  ...props
}: AppTextProps) {
  return (
    <Text
      {...props}
      style={[
        styles.base,
        styles[variant],
        color ? { color } : undefined,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.text,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.primary,
  },
  heading: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primary,
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 13,
    color: colors.accent,
  },
});
