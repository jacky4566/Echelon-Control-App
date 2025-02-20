import React, { useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DeviceModal from "./DeviceConnectionModal";
import useBLE from "./useBLE";

const App = () => {
  const {
    allDevices,
    connectedDevice,
    connectToDevice,
    requestPermissions,
    scanForPeripherals,
    cadence,
    difficulty,
    setDifficulty,
    workoutTimer,
  } = useBLE();
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

  //Checks for permission and starts a new scan
  const scanForDevices = async () => {
    const isPermissionsEnabled = await requestPermissions();
    if (isPermissionsEnabled) {
      scanForPeripherals();
    }
  };

  const hideModal = () => {
    setIsModalVisible(false);
  };

  const openModal = async () => {
    scanForDevices();
    setIsModalVisible(true);
  };

  // Functions to increase and decrease difficulty
  const onIncreaseDifficulty = () => {
    setDifficulty(difficulty + 1);
  };

  const onDecreaseDifficulty = () => {
    setDifficulty(Math.max(0, difficulty - 1));
  };

  //Generates a formatted time stamp mm:ss for display
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };


  return (
    <SafeAreaView style={[styles.container]}>
      <View style={styles.TitleWrapper}>
        {connectedDevice ? (
          <>
            <Text style={styles.TitleText}>Connected</Text>
            {/* Displaying the workout data */}
            <Text style={styles.dataText}>Cadence: {cadence}</Text>
            <Text style={styles.dataText}>Difficulty: {difficulty}</Text>
            <Text style={styles.dataText}>Workout Timer: {formatTime(workoutTimer)}</Text>
          </>
        ) : (
          <Text style={styles.TitleText}>
            Found Devices
          </Text>
        )}
      </View>
      <TouchableOpacity onPress={openModal} style={styles.ctaButton}>
        <Text style={styles.ctaButtonText}>Connect</Text>
      </TouchableOpacity>
      <DeviceModal
        closeModal={hideModal}
        visible={isModalVisible}
        connectToPeripheral={connectToDevice}
        devices={allDevices}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f2f2",
  },
  TitleWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  TitleText: {
    fontSize: 30,
    fontWeight: "bold",
    textAlign: "center",
    marginHorizontal: 20,
    color: "black",
  },
  dataText: {
    fontSize: 20,
    marginTop: 10,
    color: "black",
  },
  buttonContainer: {
    flexDirection: "row",
    marginTop: 20,
  },
  ctaButton: {
    backgroundColor: "#FF6060",
    justifyContent: "center",
    alignItems: "center",
    height: 50,
    marginHorizontal: 20,
    marginBottom: 5,
    borderRadius: 8,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
});

export default App;
