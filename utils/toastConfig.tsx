// utils/toastConfig.tsx
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";

const ToastBase = ({
  iconName,
  iconColor,
  text1,
  text2,
  backgroundColor,
  textColor = "#FFFFFF",
}: {
  iconName: string;
  iconColor: string;
  text1: string;
  text2?: string;
  backgroundColor: string;
  textColor?: string;
}) => (
  <Animated.View
    entering={FadeInDown}
    exiting={FadeOutUp}
    className="flex-row items-start gap-3 px-5 py-4 rounded-2xl mx-4 mt-1"
    style={{
      backgroundColor,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 10,
    }}
  >
    <Ionicons
      name={iconName as any}
      size={26}
      color={iconColor}
      style={{ marginTop: 2 }}
    />
    <View className="flex-1">
      <Text
        style={{
          color: textColor,
          fontSize: 16,
          fontWeight: "700",
          marginBottom: text2 ? 2 : 0,
        }}
      >
        {text1}
      </Text>
      {text2 && (
        <Text
          style={{
            color: textColor,
            fontSize: 14,
            opacity: 0.9,
          }}
        >
          {text2}
        </Text>
      )}
    </View>
  </Animated.View>
);

export const toastConfig = {
  success: ({ text1, text2 }: any) => (
    <ToastBase
      iconName="checkmark-circle"
      iconColor="#34D399" // Emerald-400
      backgroundColor="#047857" // Green-700
      text1={text1}
      text2={text2}
    />
  ),
  error: ({ text1, text2 }: any) => (
    <ToastBase
      iconName="alert-circle"
      iconColor="#F87171" // Red-400
      backgroundColor="#B91C1C" // Red-700
      text1={text1}
      text2={text2}
    />
  ),
  info: ({ text1, text2 }: any) => (
    <ToastBase
      iconName="information-circle"
      iconColor="#60A5FA" // Blue-400
      backgroundColor="#1D4ED8" // Blue-700
      text1={text1}
      text2={text2}
    />
  ),
};
