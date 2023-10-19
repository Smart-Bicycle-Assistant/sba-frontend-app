import React, {useRef, useEffect} from 'react';
import {SafeAreaView, StyleSheet, Dimensions} from 'react-native';
import WebView, {WebViewMessageEvent} from 'react-native-webview';
import Geolocation from '@react-native-community/geolocation';

const deviceHeight = Dimensions.get('window').height;
const deviceWidth = Dimensions.get('window').width;

const App = () => {
  const webRef = useRef<WebView | null>(null);

  const native_to_web = () => {
    webRef.current?.postMessage(
      '전송 데이터(native_to_web): 웹으로 데이터 전송',
    );
  };

  const errorHandler = ({nativeEvent}) =>
    console.warn('WebView error: ', nativeEvent);

  const web_to_native = (event: WebViewMessageEvent) => {
    console.log('받은 데이터(web_to_native) : ' + event.nativeEvent.data);
  };

  useEffect(() => {
    const watchId = Geolocation.watchPosition(
      position => {
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        webRef.current?.postMessage(JSON.stringify(locationData));
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

    return () => {
      Geolocation.clearWatch(watchId);
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        style={styles.webview}
        ref={webRef}
        source={{uri: 'http://172.21.34.178:5173/'}}
        javaScriptEnabled={true}
        onLoad={native_to_web}
        onError={errorHandler}
        onMessage={web_to_native}
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
