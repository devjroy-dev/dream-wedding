import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  return (
    <View style={{ flex: 1, backgroundColor: '#F5F0E8', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color="#C9A84C" size="large" />
    </View>
  );
}
