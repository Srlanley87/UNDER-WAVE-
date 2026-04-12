import { useState } from 'react';
import { Platform, View, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
}

function WebSearchBar({ value, onChange }: SearchBarProps) {
  const [focused, setFocused] = useState(false);
  const { motion } = require('framer-motion');

  return (
    <motion.div
      animate={{ width: focused ? '100%' : '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#111111',
        borderRadius: 12,
        padding: '10px 14px',
        border: focused
          ? '1px solid #F59E0B'
          : '1px solid rgba(255,255,255,0.08)',
        marginBottom: 4,
        transition: 'border-color 0.2s',
        boxShadow: focused ? '0 0 0 3px rgba(245,158,11,0.12)' : 'none',
      }}
    >
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, flexShrink: 0 }}>
        🔍
      </span>
      <input
        type="text"
        placeholder="Search tracks, artists…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: '#ffffff',
          fontSize: 15,
        }}
      />
      {value.length > 0 && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.85 }}
          onClick={() => onChange('')}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '50%',
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.6)',
            fontSize: 11,
            flexShrink: 0,
          }}
        >
          ✕
        </motion.button>
      )}
    </motion.div>
  );
}

function NativeSearchBar({ value, onChange }: SearchBarProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#111111',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: focused ? '#F59E0B' : 'rgba(255,255,255,0.08)',
        marginBottom: 4,
      }}
    >
      <Ionicons name="search" size={16} color="rgba(255,255,255,0.4)" />
      <TextInput
        placeholder="Search tracks, artists…"
        placeholderTextColor="rgba(255,255,255,0.3)"
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          flex: 1,
          color: '#ffffff',
          fontSize: 15,
        }}
      />
    </View>
  );
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  if (Platform.OS === 'web') {
    return <WebSearchBar value={value} onChange={onChange} />;
  }
  return <NativeSearchBar value={value} onChange={onChange} />;
}
