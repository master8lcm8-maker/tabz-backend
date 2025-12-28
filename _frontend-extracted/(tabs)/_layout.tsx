// app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      {/* Home screen */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />

      {/* Buyer orders screen */}
      <Tabs.Screen
        name="orders"
        options={{
          title: 'My Orders',
        }}
      />

      {/* Drinks screen */}
      <Tabs.Screen
        name="drinks"
        options={{
          title: 'Drinks',
        }}
      />

      {/* OWNER dashboard screen */}
      <Tabs.Screen
        name="owner-dashboard"
        options={{
          title: 'Owner',
        }}
      />
    </Tabs>
  );
}
