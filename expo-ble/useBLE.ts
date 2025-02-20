/* eslint-disable no-bitwise */
import { useMemo, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";

import * as ExpoDevice from "expo-device";

//import base64 from "react-native-base64";
import {
  BleError,
  BleManager,
  Characteristic,
  Device,
} from "react-native-ble-plx";

const deviceUUID = "0bf669f0-45f2-11e7-9598-0800200c9a66";
const connectUUID = "0bf669f1-45f2-11e7-9598-0800200c9a66";
const writeUUID = "0bf669f2-45f2-11e7-9598-0800200c9a66"
const sensorUUID = "0bf669f4-45f2-11e7-9598-0800200c9a66";

const startExercise = new Uint8Array([0xF0, 0xB0, 0x01, 0x01, 0xA2]);

const bleManager = new BleManager();

function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binary = '';
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64); // Decode Base64 to binary string
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function printHex(data: Uint8Array | number[]): string {
  return Array.from(data)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join(' ');
}

function useBLE() {
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [cadence, setCadence] = useState(0);
  const [workoutTimer, setWorkoutTimer] = useState(0);
  const [difficulty, setDifficulty] = useState(0);
  const setDifficultyAndUpdateDevice = (newDifficulty: number) => {
    setDifficulty(newDifficulty); // Update state
    if (connectedDevice) {
      updateDeviceDifficulty(connectedDevice, newDifficulty); // Send updated difficulty to device
    }
  };

  const requestAndroid31Permissions = async () => {
    const bluetoothScanPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      {
        title: "Location Permission",
        message: "Bluetooth Low Energy requires Location",
        buttonPositive: "OK",
      }
    );
    const bluetoothConnectPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      {
        title: "Location Permission",
        message: "Bluetooth Low Energy requires Location",
        buttonPositive: "OK",
      }
    );
    const fineLocationPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: "Location Permission",
        message: "Bluetooth Low Energy requires Location",
        buttonPositive: "OK",
      }
    );

    return (
      bluetoothScanPermission === "granted" &&
      bluetoothConnectPermission === "granted" &&
      fineLocationPermission === "granted"
    );
  };

  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      if ((ExpoDevice.platformApiLevel ?? -1) < 31) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Location Permission",
            message: "Bluetooth Low Energy requires Location",
            buttonPositive: "OK",
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const isAndroid31PermissionsGranted =
          await requestAndroid31Permissions();

        return isAndroid31PermissionsGranted;
      }
    } else {
      return true;
    }
  };

  const connectToDevice = async (device: Device) => {
    try {
      const deviceConnection = await bleManager.connectToDevice(device.id);
      setConnectedDevice(deviceConnection);
      await deviceConnection.discoverAllServicesAndCharacteristics();
      bleManager.stopDeviceScan();

      // Get all services
      const services = await deviceConnection.services();

      // Log each service and its characteristics
      for (const service of services) {
        console.log(`Service UUID: ${service.uuid}`);

        // Get characteristics for each service
        const characteristics = await deviceConnection.characteristicsForService(service.uuid);
        for (const characteristic of characteristics) {
          console.log(`  Characteristic UUID: ${characteristic.uuid}`);
        }
      }

      startDevice(deviceConnection);
      startStreamingData(deviceConnection);
    } catch (e) {
      console.log("FAILED TO CONNECT", e);
    }
  };

  const isDuplicteDevice = (devices: Device[], nextDevice: Device) =>
    devices.findIndex((device) => nextDevice.id === device.id) > -1;

  const scanForPeripherals = () =>
    //Look for all devices with specific UUID
    bleManager.startDeviceScan([deviceUUID], null, (error, device) => {
      if (error) {
        console.log(error);
      }

      //Add Devices to list
      if (device) {
        setAllDevices((prevState: Device[]) => {
          if (!isDuplicteDevice(prevState, device)) {
            return [...prevState, device];
          }
          return prevState;
        });
      }
    });

  const onDataUpdate = (
    error: BleError | null,
    characteristic: Characteristic | null
  ) => {
    if (error) {
      console.log(error);
      return;
    } else if (!characteristic?.value) {
      console.log("No Data was received");
      return;
    }


    const data = base64ToUint8Array(characteristic.value);
    //console.log(printHex(data));
    if (data[0] === 0xF0) {
      if (data[1] === 0xD0) {
        //Unknown
      }
      else if (data[1] === 0xD1) {
        //New Telemetrics
        const newTimer = (data[3] * 256) + data[4];
        setWorkoutTimer(newTimer);
        //console.log("New Workout Timer:" + newTimer);
        const newCadence = (data[9] * 256) + data[10];
        setCadence(newCadence);
        //console.log("New Cadence:" + newCadence);
      }
      else if (data[1] === 0xD2) {
        //Difficulty Change
        const newDiff = data[3];
        setDifficulty(newDiff);
        console.log(printHex(data));
        //console.log("New Dif:" + newDiff);
      }
    }

  };

  const startDevice = async (device: Device) => {
    if (device) {
      device.writeCharacteristicWithoutResponseForService(connectUUID, writeUUID, uint8ArrayToBase64(startExercise));
    } else {
      console.log("No Device Connected");
    }
  };

  const startStreamingData = async (device: Device) => {
    if (device) {
      device.monitorCharacteristicForService(
        connectUUID,
        sensorUUID,
        onDataUpdate
      );
    } else {
      console.log("No Device Connected");
    }
  };

  const updateDeviceDifficulty = async (device: Device, newDifficulty: number) => {
    //Send Difficulty update to device
    //Currently this function does not work. See example: https://github.com/cagnulein/qdomyos-zwift/blob/254786ea5d8ccdc2da77669a416248708e77b2b6/src/virtualdevices/virtualbike.cpp#L1643
    try {
      const difficultyBytes = new Uint8Array([0xF0, 0xD2, 0x01, newDifficulty, 0x00]);

      let sum = 0;
      for (let i = 0; i < difficultyBytes.length; i++) {
        sum += difficultyBytes[i];
      }
      difficultyBytes[4] = sum & 0xFF; // Ensure it fits in one byte
      console.log(printHex(difficultyBytes));

      if (device) {
        device.writeCharacteristicWithoutResponseForService(
          connectUUID,
          writeUUID, //writing to sensorUUID fails
          uint8ArrayToBase64(difficultyBytes)
        );
        console.log(`Sent Difficulty ${newDifficulty} to the device.`);
      } else {
        console.log("No Device Connected");
      }

    } catch (error) {
      console.error("Failed to send difficulty update to device:", error);
    }
  };

  return {
    connectToDevice,
    allDevices,
    connectedDevice,
    requestPermissions,
    scanForPeripherals,
    cadence,
    difficulty,
    setDifficulty: setDifficultyAndUpdateDevice,
    workoutTimer,
    startStreamingData,
  };
}

export default useBLE;