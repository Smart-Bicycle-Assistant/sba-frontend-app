import React, {useRef, useEffect, useState} from 'react';
import {SafeAreaView, StyleSheet, Dimensions, Text} from 'react-native';
import WebView, {WebViewMessageEvent} from 'react-native-webview';
import Geolocation, {
  GeolocationResponse,
} from '@react-native-community/geolocation';

const deviceHeight = Dimensions.get('window').height;
const deviceWidth = Dimensions.get('window').width;

const App: React.FC = () => {
  const webRef = useRef<WebView | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState<number | null>(null);

  const native_to_web = (data: string) => {
    const message = JSON.stringify(data);
    webRef.current?.injectJavaScript(`window.postMessage(${message}, '*');`);
  };

  const errorHandler = ({nativeEvent}: WebViewMessageEvent) =>
    console.warn('WebView error: ', nativeEvent);

  const web_to_native = (event: WebViewMessageEvent) => {
    console.log('받은 데이터(web_to_native) : ' + event.nativeEvent.data);
  };

  useEffect(() => {
    Geolocation.requestAuthorization();

    const sendLocationToWebView = () => {
      Geolocation.getCurrentPosition(
        (position: GeolocationResponse) => {
          const newLatitude = position.coords.latitude;
          const newLongitude = position.coords.longitude;
          const newSpeed = position.coords.speed;

          setLatitude(newLatitude);
          setLongitude(newLongitude);
          setCurrentSpeed(newSpeed);

          const locationData = {
            latitude: newLatitude,
            longitude: newLongitude,
            speed: newSpeed,
          };

          native_to_web(JSON.stringify(locationData));
          console.log(locationData);
        },
        error => {
          console.error('Error getting location:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 1000,
          distanceFilter: 10,
        },
      );
    };

    sendLocationToWebView();

    const locationInterval = setInterval(sendLocationToWebView, 6000);

    return () => {
      clearInterval(locationInterval);
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text>{longitude}</Text>
      <Text>{latitude}</Text>
      <Text>{currentSpeed}</Text>
      <WebView
        style={styles.webview}
        ref={webRef}
        source={{uri: 'https://sba-frontend-web.vercel.app/'}}
        javaScriptEnabled={true}
        onLoad={() => native_to_web('WebView Loaded')}
        onError={errorHandler}
        onMessage={event => web_to_native(event)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  webview: {
    flex: 1,
    width: deviceWidth,
    height: deviceHeight,
  },
});

export default App;
