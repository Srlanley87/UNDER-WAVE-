import { View } from 'react-native';
import FollowingFeed from '@/components/following/FollowingFeed';

export default function Following() {
  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <FollowingFeed />
    </View>
  );
}
