import React, {useRef, useEffect, useState} from 'react';
import {BackHandler} from 'react-native';
import TcpSocket from 'react-native-tcp-socket';
import {Buffer} from 'buffer';
import {
  SafeAreaView,
  StyleSheet,
  useWindowDimensions,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import WebView, {WebViewMessageEvent} from 'react-native-webview';
import Geolocation, {
  GeolocationResponse,
} from '@react-native-community/geolocation';

const App: React.FC = () => {
  const webRef = useRef<WebView | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState<number | null>(null);
  const [Width, setWidth] = useState<number>(0);
  const [Height, setHeight] = useState<number>(0);
  const [boxCount, setBoxCount] = useState<number>(0);

  const server = TcpSocket.createServer(function (socket) {
    socket.on('data', (data: Buffer) => {
      console.log(data.length);
      var offset = 0;
      setWidth(data.readFloatBE(offset));
      offset += 4;
      setHeight(data.readInt32BE(offset)); // 얘는 차종류 - 1.차   2.버스   3.트럭
      offset += 4;
      setBoxCount(data.readInt32BE(offset));

      Width && Width > 450 ? setBoxCount(1) : setBoxCount(0);
    });
  }).listen({port: 50000});

  const deviceWidth = useWindowDimensions().width;
  const deviceHeight = useWindowDimensions().height;

  const native_to_web = (data: string) => {
    const message = JSON.stringify(data);
    webRef.current?.injectJavaScript(`window.postMessage(${message}, '*');`);
  };

  const errorHandler = ({nativeEvent}: WebViewMessageEvent) =>
    console.warn('WebView error: ', nativeEvent);

  async function requestLocationPermission() {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location for ...',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Location permission granted');
        } else {
          console.log('Location permission denied');
        }
      } catch (err) {
        console.warn(err);
      }
    }
  }

  const [isCanGoBack, setIsCanGoBack] = useState(false);

  const onPressHardwareBackButton = () => {
    if (webRef.current && isCanGoBack) {
      webRef.current.goBack();
      return true;
    } else {
      return false;
    }
  };

  useEffect(() => {
    BackHandler.addEventListener(
      'hardwareBackPress',
      onPressHardwareBackButton,
    );
    return () => {
      BackHandler.removeEventListener(
        'hardwareBackPress',
        onPressHardwareBackButton,
      );
    };
  }, [isCanGoBack]);

  useEffect(() => {
    Geolocation.requestAuthorization();
    requestLocationPermission();

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
            Width: Width,
            Height: Height,
            boxCount: boxCount,
          };

          native_to_web(JSON.stringify(locationData));
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

    const locationInterval = setInterval(sendLocationToWebView, 1000);

    return () => {
      clearInterval(locationInterval);
    };
  }, [Width, Height, boxCount]);

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        style={{flex: 1, width: deviceWidth, height: deviceHeight}}
        ref={webRef}
        source={{uri: 'https://sba-frontend-web.vercel.app/'}}
        javaScriptEnabled={true}
        injectedJavaScript={`
        (function() {
          function wrap(fn) {
            return function wrapper() {
              var res = fn.apply(this, arguments);
              window.ReactNativeWebView.postMessage('navigationStateChange');
              return res;
            }
          }
    
          history.pushState = wrap(history.pushState);
          history.replaceState = wrap(history.replaceState);
          window.addEventListener('popstate', function() {
            window.ReactNativeWebView.postMessage('navigationStateChange');
          });
        })();
    
        true;
      `}
        onLoad={() => native_to_web('WebView Loaded')}
        onError={errorHandler}
        onMessage={({nativeEvent: state}) => {
          if (state.data === 'navigationStateChange') {
            setIsCanGoBack(state.canGoBack);
          }
        }}
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
  },
});

export default App;
