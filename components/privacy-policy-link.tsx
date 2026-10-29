import { Linking, Pressable, StyleSheet, Text } from 'react-native';

import { PRIVACY_POLICY_URL } from '@/constants/privacidade';

export function PrivacyPolicyLink() {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => {
        void Linking.openURL(PRIVACY_POLICY_URL);
      }}
      style={styles.button}>
      <Text style={styles.label}>Política de privacidade</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 8,
  },
  label: {
    color: '#0F7A6C',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
