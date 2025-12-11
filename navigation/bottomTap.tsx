import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import Home from "../pages/home"
import Profile from "../pages/profile"
import { View } from "react-native";
import UploadVideo from "../pages/uploadVideo";

const Tab = createBottomTabNavigator();

export default function BottomTap() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "black",
          paddingBottom: 0,
          paddingTop: 0,
          height: 75,
          borderTopWidth: 0,
        },
        tabBarActiveTintColor: "white",
        tabBarInactiveTintColor: "gray",
      }}
    >
      <Tab.Screen
        name="Home"
        component={Home}
        options={{
          tabBarIcon: ({ color }) => (
            <Ionicons name="home-outline" size={24} color={color} />
          ),
          tabBarLabel: "Inicio",
        }}
      />
      

      <Tab.Screen
        name="Upload"
        component={UploadVideo}
        options={{
          tabBarIcon: ({ color }) => (
            <Ionicons name="add-circle-outline" size={28} color={color} />
          ),
          tabBarLabel: "Subir",
        }}
      />

      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-outline" size={24} color={color} />
          ),
          tabBarLabel: "Perfil",
        }}
      />
    </Tab.Navigator>
  );
}
